import 'server-only';
import { appendExecution } from '@/lib/ai/agent/store';
import type { ToolContext, ToolResult } from './types';
import type { ProposedFix } from '@/lib/ai/schema';

export type PlanExecutorInput = {
  plan: ProposedFix[];
};

export async function runPlanExecutorTool(input: PlanExecutorInput, context: ToolContext): Promise<ToolResult> {
  const { sessionId } = context;
  const script = input.plan
    .map((fix) => `-- ${fix.title}\n${fix.steps.map((step) => `/* step */ ${step}`).join('\n')}\nGO`)
    .join('\n\n');
  await appendExecution(sessionId, 'plan', {
    sqlText: script,
    resultJson: JSON.stringify({ dryRun: true, steps: input.plan.length }),
    succeeded: true
  });
  return { ok: true, data: { dryRun: true } };
}
