import 'server-only';
import { DEFAULT_MODEL, getOpenAI } from '@/lib/ai/openai';
import { ActionSchema, type AgentAction } from '@/lib/ai/schema';
import type { StoredMessage } from './store';
import type { MemoryRecord } from '@/lib/ai/memory/vectorMemory';

export type DiagnoseArgs = {
  issueType: string;
  sessionId: string;
  transcript: StoredMessage[];
  memory: MemoryRecord[];
  context?: unknown;
};

function buildPrompt(args: DiagnoseArgs): string {
  const { issueType, transcript, memory, context } = args;
  const recentMessages = transcript.slice(-10).map((msg) => ({ role: msg.role, content: msg.content })).reverse();
  return JSON.stringify({
    issueType,
    context,
    memory,
    transcript: recentMessages,
    instructions: 'Return strict JSON with reasoning, actions, needMoreData flag, and optional proposedFixes array.'
  });
}

function fallbackAction(): AgentAction {
  return {
    reasoning: 'Collecting baseline diagnostics for waits, blocking, query performance, and fragmentation to understand the issue.',
    actions: [
      { tool: 'SqlTool', input: { operation: 'waitStatsDiff', top: 15 } },
      { tool: 'SqlTool', input: { operation: 'blockingTree', top: 25 } },
      { tool: 'SqlTool', input: { operation: 'topCpuQueries', top: 15 } },
      { tool: 'SqlTool', input: { operation: 'fragmentation', top: 15 } },
      { tool: 'SqlTool', input: { operation: 'indexUsage', top: 25 } },
      { tool: 'SqlTool', input: { operation: 'largeHeaps', top: 10 } }
    ],
    needMoreData: false,
    next: 'planner'
  } satisfies AgentAction;
}

export async function runDiagnoseAgent(args: DiagnoseArgs): Promise<AgentAction> {
  if (!process.env.OPENAI_API_KEY) {
    return fallbackAction();
  }
  try {
    const openai = getOpenAI();
    const response = await openai.responses.create({
      model: DEFAULT_MODEL,
      input: [
        {
          role: 'system',
          content:
            'You are DiagnoseAgent, a SQL Server performance engineer. Use provided memory and transcript to choose diagnostic tool actions. Respond with strict JSON only.'
        },
        { role: 'user', content: buildPrompt(args) }
      ]
    });
    const text = response.output_text ?? '';
    const parsed = ActionSchema.safeParse(JSON.parse(text));
    if (parsed.success) {
      return parsed.data;
    }
  } catch (error) {
    console.error('DiagnoseAgent fallback', error);
  }
  return fallbackAction();
}
