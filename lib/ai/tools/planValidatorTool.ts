import 'server-only';
import type { ToolContext, ToolResult } from './types';

export type PlanValidatorInput = {
  script: string;
};

const dangerousTokens = ['DROP ', 'ALTER ', 'TRUNCATE ', 'DISABLE ', 'ENABLE '];

export async function runPlanValidatorTool(input: PlanValidatorInput, _context: ToolContext): Promise<ToolResult> {
  const warnings: string[] = [];
  for (const token of dangerousTokens) {
    if (input.script.toUpperCase().includes(token)) {
      warnings.push(`Script contains dangerous token: ${token.trim()}`);
    }
  }
  const hasRollback = /ROLLBACK|BACKUP|SAVEPOINT/i.test(input.script);
  if (!hasRollback) {
    warnings.push('No rollback or mitigation steps detected.');
  }
  return {
    ok: warnings.length === 0,
    data: { warnings }
  };
}
