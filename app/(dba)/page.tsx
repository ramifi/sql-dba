import { MetricCard } from '@/components/MetricCard';
import { ChartTimeseries, type TimeseriesPoint } from '@/components/ChartTimeseries';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

async function loadMetrics() {
  const res = await fetch(`${baseUrl}/api/metrics/overview`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to load metrics');
  }
  return res.json();
}

function formatCpu(value: unknown): string {
  const num = Number(value ?? 0);
  return `${num.toFixed(0)} ms`;
}

function formatFragmentation(value: unknown): string {
  const num = Number(value ?? 0);
  return `${num.toFixed(1)}%`;
}

export default async function DashboardPage() {
  const metrics = await loadMetrics();
  const waits = (metrics.topWaits ?? []).slice(0, 4);
  const blocking = metrics.blocking ?? [];
  const topCpu = metrics.topCpu ?? [];
  const fragmentation = metrics.fragmentation ?? [];

  const waitSeries: TimeseriesPoint[] = waits.map((w: any, idx: number) => ({ timestamp: w.wait_type ?? `Wait ${idx + 1}`, value: Number(w.wait_time_ms ?? 0) }));

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-white">Health Overview</h1>
        <p className="text-sm text-slate-400">Live diagnostics pulled from SQL Server DMVs.</p>
      </header>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Top Wait" value={waits[0]?.wait_type ?? 'N/A'} trend={`${Number(waits[0]?.wait_time_ms ?? 0).toFixed(0)} ms`} />
        <MetricCard title="Blocking Sessions" value={blocking.length.toString()} trend={`Longest wait ${(Number(blocking[0]?.wait_duration_ms ?? 0) / 1000).toFixed(1)} s`} />
        <MetricCard title="Top CPU Query" value={formatCpu(topCpu[0]?.avg_cpu_time)} trend={topCpu[0]?.query_sql_text?.slice(0, 32) ?? 'No data'} />
        <MetricCard title="Highest Fragmentation" value={formatFragmentation(fragmentation[0]?.avg_fragmentation_in_percent)} trend={fragmentation[0]?.object_name ?? 'No data'} />
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold text-white">Wait Time Snapshot</h2>
          <ChartTimeseries data={waitSeries} />
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold text-white">Hot Tables (MB)</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            {(metrics.hotTables ?? []).slice(0, 6).map((table: any, idx: number) => (
              <li key={idx} className="flex items-center justify-between">
                <span>{table.schema_name}.{table.object_name}</span>
                <span>{Number(table.used_mb ?? 0).toFixed(1)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
