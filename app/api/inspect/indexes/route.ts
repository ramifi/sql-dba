import { NextResponse } from 'next/server';
import { z } from 'zod';
import { run as runTool } from '@/lib/ai/tools';

const RequestSchema = z.object({
  schemaName: z.string(),
  tableName: z.string(),
  sessionId: z.string().uuid().optional()
});

export async function POST(request: Request) {
  const start = Date.now();
  let status = 200;
  try {
    const body = await request.json();
    const parsed = RequestSchema.parse(body);
    const sessionId = parsed.sessionId ?? '00000000-0000-0000-0000-000000000000';
    const result = await runTool('IndexInspectorTool', parsed, { sessionId });
    if (!result.ok) {
      status = 500;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json(result.data ?? []);
  } catch (error) {
    status = 500;
    return NextResponse.json({ error: (error as Error).message }, { status });
  } finally {
    const duration = Date.now() - start;
    console.log(`[inspect.indexes] POST ${status} ${duration}ms`);
  }
}
