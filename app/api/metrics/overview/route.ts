import { NextResponse } from 'next/server';
import { run as runTool } from '@/lib/ai/tools';

export async function GET() {
  const start = Date.now();
  let status = 200;
  try {
    const result = await runTool('MetricsTool', { scope: 'overview' }, { sessionId: '00000000-0000-0000-0000-000000000000' });
    if (!result.ok) {
      status = 500;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json(result.data ?? {});
  } catch (error) {
    status = 500;
    return NextResponse.json({ error: (error as Error).message }, { status });
  } finally {
    const duration = Date.now() - start;
    console.log(`[metrics.overview] GET ${status} ${duration}ms`);
  }
}
