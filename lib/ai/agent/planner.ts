import 'server-only';
import { DEFAULT_MODEL, getOpenAI } from '@/lib/ai/openai';
import { ProposedFixSchema, type ProposedFix } from '@/lib/ai/schema';
import type { MemoryRecord } from '@/lib/ai/memory/vectorMemory';

export type PlannerArgs = {
  issueType: string;
  observations: unknown;
  memory: MemoryRecord[];
};

function fallbackPlan(): ProposedFix[] {
  return [
    {
      title: 'Review high wait types and blocking chains',
      summary: 'Analyze captured wait stats and blocking tree to confirm root blockers and mitigate scheduling pressure.',
      steps: [
        'Inspect top waits diff to confirm dominant waits and correlate with system workload.',
        'Trace blocking chain sessions, capture currently executing statements, and notify owners.',
        'Schedule follow-up to reassess wait stats after mitigation.'
      ],
      risks: ['Potential workload spike while investigating blocking sessions.'],
      rollback: ['No rollback needed; monitoring only.']
    },
    {
      title: 'Draft index and query tuning actions',
      summary: 'Leverage top CPU queries, fragmentation, and index usage data to prepare tuning backlog.',
      steps: [
        'Target top CPU queries for plan review and parameter sniffing analysis.',
        'Identify heavily fragmented indexes for maintenance scheduling with ONLINE option when possible.',
        'Document unused or duplicate indexes flagged by usage stats for later cleanup review.'
      ],
      risks: ['Maintenance windows may be required for index operations.'],
      rollback: ['Revert maintenance scheduling if workload impact observed.']
    }
  ];
}

export async function runPlannerAgent(args: PlannerArgs): Promise<ProposedFix[]> {
  if (!process.env.OPENAI_API_KEY) {
    return fallbackPlan();
  }
  try {
    const openai = getOpenAI();
    const response = await openai.responses.create({
      model: DEFAULT_MODEL,
      input: [
        {
          role: 'system',
          content: 'You are PlannerAgent. Convert diagnostic observations into concrete, reviewable remediation plans with risks and rollback. Return JSON array of ProposedFix objects.'
        },
        {
          role: 'user',
          content: JSON.stringify({ observations: args.observations, memory: args.memory, issueType: args.issueType })
        }
      ]
    });
    const text = response.output_text ?? '';
    const parsed = ProposedFixSchema.array().safeParse(JSON.parse(text));
    if (parsed.success) {
      return parsed.data;
    }
  } catch (error) {
    console.error('PlannerAgent fallback', error);
  }
  return fallbackPlan();
}
