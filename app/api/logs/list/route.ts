import { NextResponse } from 'next/server';
import { z } from 'zod';
import { listExecutions } from '@/lib/ai/agent/store';

export async function GET(request: Request) {
  const start = Date.now();
  let status = 200;
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const schema = z.string().uuid();
    const parsed = schema.parse(sessionId);
    const executions = await listExecutions(parsed);
    return NextResponse.json({ executions });
  } catch (error) {
    status = 400;
    return NextResponse.json({ error: (error as Error).message }, { status });
  } finally {
    const duration = Date.now() - start;
    console.log(`[logs.list] GET ${status} ${duration}ms`);
  }
}
