import 'server-only';
import { run as runTool } from '@/lib/ai/tools';
import type { ProposedFix } from '@/lib/ai/schema';

export async function dryRunPlan(sessionId: string, plan: ProposedFix[]): Promise<void> {
  await runTool('PlanExecutorTool', { plan }, { sessionId });
}
