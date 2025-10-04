import { NextResponse } from 'next/server';
import { z } from 'zod';
import { run as runTool } from '@/lib/ai/tools';

const RequestSchema = z.object({
  sessionId: z.string().uuid().optional(),
  schemaName: z.string().optional(),
  tableName: z.string().optional()
});

export async function POST(request: Request) {
  const start = Date.now();
  let status = 200;
  try {
    const body = await request.json();
    const parsed = RequestSchema.parse(body);
    const sessionId = parsed.sessionId ?? '00000000-0000-0000-0000-000000000000';
    const largeTables = await runTool('SqlTool', { operation: 'largeHeaps', top: 20 }, { sessionId });
    if (!largeTables.ok) {
      status = 500;
      return NextResponse.json({ error: largeTables.error }, { status });
    }
    if (parsed.schemaName && parsed.tableName) {
      const deps = await runTool(
        'DependencyScannerTool',
        { schemaName: parsed.schemaName, tableName: parsed.tableName },
        { sessionId }
      );
      if (!deps.ok) {
        status = 500;
        return NextResponse.json({ error: deps.error }, { status });
      }
      return NextResponse.json({ candidates: largeTables.data, dependencies: deps.data });
    }
    return NextResponse.json({ candidates: largeTables.data });
  } catch (error) {
    status = 500;
    return NextResponse.json({ error: (error as Error).message }, { status });
  } finally {
    const duration = Date.now() - start;
    console.log(`[advisor.partitioning] POST ${status} ${duration}ms`);
  }
}
