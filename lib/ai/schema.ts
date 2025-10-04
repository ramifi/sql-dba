import { z } from 'zod';

export const ProposedFixSchema = z.object({
  title: z.string(),
  summary: z.string(),
  steps: z.array(z.string()),
  risks: z.array(z.string()).default([]),
  rollback: z.array(z.string()).default([])
});

export const ActionSchema = z.object({
  reasoning: z.string(),
  actions: z.array(
    z.object({
      tool: z.enum([
        'SqlTool',
        'MetricsTool',
        'QueryStoreTool',
        'IndexInspectorTool',
        'DependencyScannerTool',
        'PlanValidatorTool'
      ]),
      input: z.record(z.any())
    })
  ),
  needMoreData: z.boolean().default(false),
  next: z.string().optional(),
  proposedFixes: z.array(ProposedFixSchema).optional()
});

export const PlanStepSchema = z.object({
  title: z.string(),
  summary: z.string(),
  steps: z.array(z.string()).min(1),
  risks: z.array(z.string()).min(1),
  rollback: z.array(z.string()).min(1)
});

export const PlanApprovalSchema = z.object({
  sessionId: z.string().uuid(),
  plan: z.array(PlanStepSchema)
});

export type AgentAction = z.infer<typeof ActionSchema>;
export type ProposedFix = z.infer<typeof ProposedFixSchema>;
export type PlanApproval = z.infer<typeof PlanApprovalSchema>;
