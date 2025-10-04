import 'server-only';
import { DEFAULT_EMBEDDING_MODEL, getOpenAI } from '@/lib/ai/openai';
import { runDiagnoseAgent } from '@/lib/ai/agent/diagnose';
import { runPlannerAgent } from '@/lib/ai/agent/planner';
import { ensureSchema, createSession, appendMessage, listMessages, listExecutions } from '@/lib/ai/agent/store';
import { run as runTool } from '@/lib/ai/tools';
import type { ToolName } from '@/lib/ai/tools';
import type { ProposedFix } from '@/lib/ai/schema';
import { getSimilarMemories, insertMemory } from '@/lib/ai/memory/vectorMemory';

export type AgentRunInput = {
  sessionId?: string;
  issueType: string;
  context?: {
    title?: string;
    message?: string;
  };
};

export type AgentRunResponse = {
  sessionId: string;
  transcript: Array<{ role: string; content: string; ts: string; toolName?: string }>;
  executions: Array<{ id: number; kind: string; ok: boolean }>;
  proposedFixes: ProposedFix[];
  next?: string;
};

async function embedText(text: string): Promise<number[]> {
  if (!process.env.OPENAI_API_KEY) {
    return [];
  }
  const openai = getOpenAI();
  const response = await openai.embeddings.create({
    model: DEFAULT_EMBEDDING_MODEL,
    input: text
  });
  return response.data[0]?.embedding ?? [];
}

export async function runAgentOrchestrator(input: AgentRunInput): Promise<AgentRunResponse> {
  await ensureSchema();
  const title = input.context?.title ?? `${input.issueType} session`;
  const sessionId = input.sessionId ?? (await createSession(input.issueType, title));
  if (input.context?.message) {
    await appendMessage(sessionId, 'user', input.context.message);
  }
  const transcript = await listMessages(sessionId);
  const recentText = transcript.slice(-10).map((m) => `${m.role}: ${m.content}`).join('\n');
  const embedding = await embedText(recentText || input.issueType);
  const memory = embedding.length ? await getSimilarMemories(input.issueType, embedding) : [];

  const diagnose = await runDiagnoseAgent({
    issueType: input.issueType,
    sessionId,
    transcript,
    memory,
    context: input.context
  });

  await appendMessage(sessionId, 'assistant', diagnose.reasoning);

  const observations: Array<{ tool: ToolName; result: unknown }> = [];

  for (const action of diagnose.actions) {
    const result = await runTool(action.tool as ToolName, action.input, { sessionId });
    observations.push({ tool: action.tool as ToolName, result: result.data });
    const toolMessage = result.ok ? JSON.stringify(result.data).slice(0, 4000) : result.error ?? 'Unknown error';
    await appendMessage(sessionId, 'tool', toolMessage, action.tool);
  }

  let proposedFixes: ProposedFix[] = [];
  if (diagnose.proposedFixes && diagnose.proposedFixes.length > 0) {
    proposedFixes = diagnose.proposedFixes;
  } else if (!diagnose.needMoreData) {
    proposedFixes = await runPlannerAgent({ issueType: input.issueType, observations, memory });
  }

  if (proposedFixes.length > 0 && embedding.length) {
    const summary = proposedFixes.map((fix) => `${fix.title}: ${fix.summary}`).join('\n');
    await insertMemory(input.issueType, summary, embedding);
  }

  const updatedTranscript = await listMessages(sessionId);
  const executions = await listExecutions(sessionId);
  return {
    sessionId,
    transcript: updatedTranscript.map((msg) => ({
      role: msg.role,
      content: msg.content,
      ts: msg.createdAt,
      toolName: msg.toolName ?? undefined
    })),
    executions: executions.map((exec) => ({ id: exec.id, kind: exec.kind, ok: exec.succeeded ?? false })),
    proposedFixes,
    next: diagnose.next
  };
}
