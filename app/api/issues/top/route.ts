import { NextResponse } from 'next/server';
import { run as runTool } from '@/lib/ai/tools';

export async function GET() {
  const start = Date.now();
  let status = 200;
  try {
    const metrics = await runTool('MetricsTool', { scope: 'overview' }, { sessionId: '00000000-0000-0000-0000-000000000000' });
    if (!metrics.ok) {
      status = 500;
      return NextResponse.json({ error: metrics.error }, { status });
    }
    const data = metrics.data as Record<string, unknown>;
    const waits = Array.isArray(data?.topWaits) ? (data.topWaits as Array<{ wait_time_ms: number }>) : [];
    const blocking = Array.isArray(data?.blocking) ? (data.blocking as Array<{ wait_duration_ms: number }>) : [];
    const cpu = Array.isArray(data?.topCpu) ? (data.topCpu as Array<{ avg_cpu_time: number }>) : [];
    const fragmentation = Array.isArray(data?.fragmentation) ? (data.fragmentation as Array<{ avg_fragmentation_in_percent: number }>) : [];

    const issues = [
      {
        id: 'blocking',
        title: 'Blocking Sessions',
        severity: Math.min(10, blocking.reduce((acc, row) => acc + (row.wait_duration_ms ?? 0), 0) / 1000 || 1),
        summary: 'Active blocking chains detected from waiters with longest waits.',
        issueType: 'blocking'
      },
      {
        id: 'cpu',
        title: 'High CPU Queries',
        severity: Math.min(10, cpu.reduce((acc, row) => acc + (row.avg_cpu_time ?? 0), 0) / 5000 || 1),
        summary: 'Top CPU consumers observed in Query Store statistics.',
        issueType: 'performance'
      },
      {
        id: 'fragmentation',
        title: 'Index Fragmentation',
        severity: Math.min(10, fragmentation.reduce((acc, row) => acc + (row.avg_fragmentation_in_percent ?? 0), 0) / 100 || 1),
        summary: 'Indexes exceeding fragmentation thresholds.',
        issueType: 'maintenance'
      },
      {
        id: 'waits',
        title: 'Wait Stats Pressure',
        severity: Math.min(10, waits.reduce((acc, row) => acc + (row.wait_time_ms ?? 0), 0) / 100000 || 1),
        summary: 'Dominant wait types indicate systemic pressure.',
        issueType: 'performance'
      }
    ].sort((a, b) => b.severity - a.severity);

    return NextResponse.json({ issues });
  } catch (error) {
    status = 500;
    return NextResponse.json({ error: (error as Error).message }, { status });
  } finally {
    const duration = Date.now() - start;
    console.log(`[issues.top] GET ${status} ${duration}ms`);
  }
}
