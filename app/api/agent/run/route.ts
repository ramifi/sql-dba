import { NextResponse } from 'next/server';
import { z } from 'zod';
import { runAgentOrchestrator } from '@/lib/ai/agent/orchestrator';

const RequestSchema = z.object({
  sessionId: z.string().uuid().optional(),
  issueType: z.string(),
  context: z.object({ title: z.string().optional(), message: z.string().optional() }).optional()
});

export async function POST(request: Request) {
  const start = Date.now();
  let status = 200;
  try {
    const json = await request.json();
    const parsed = RequestSchema.parse(json);
    const result = await runAgentOrchestrator(parsed);
    return NextResponse.json(result);
  } catch (error) {
    status = 500;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status });
  } finally {
    const duration = Date.now() - start;
    console.log(`[agent.run] POST ${status} ${duration}ms`);
  }
}
