import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PlanStepSchema } from '@/lib/ai/schema';
import { run as runTool } from '@/lib/ai/tools';

const RequestSchema = z.object({
  sessionId: z.string().uuid(),
  plan: z.array(PlanStepSchema)
});

function planToScript(plan: z.infer<typeof PlanStepSchema>[]): string {
  return plan
    .map((step) => `-- ${step.title}\n${step.steps.join('\n')}\n-- Risks: ${step.risks.join('; ')}\n-- Rollback: ${step.rollback.join('; ')}`)
    .join('\n\n');
}

export async function POST(request: Request) {
  const start = Date.now();
  let status = 200;
  try {
    const body = await request.json();
    const parsed = RequestSchema.parse(body);
    const script = planToScript(parsed.plan);
    const validation = await runTool('PlanValidatorTool', { script }, { sessionId: parsed.sessionId });
    if (!validation.ok) {
      status = 400;
      return NextResponse.json({ error: validation.error ?? 'Plan validation failed' }, { status });
    }
    return NextResponse.json(validation.data ?? {});
  } catch (error) {
    status = 400;
    return NextResponse.json({ error: (error as Error).message }, { status });
  } finally {
    const duration = Date.now() - start;
    console.log(`[plan.validate] POST ${status} ${duration}ms`);
  }
}
