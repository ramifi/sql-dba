'use client';

import { useSessionStore } from '@/lib/state/useSessionStore';

export default function ExecutionsPage() {
  const executions = useSessionStore((state) => state.executions);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-white">Session Executions</h1>
        <p className="text-sm text-slate-400">SQL and plan actions recorded during the current session.</p>
      </header>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-900/80">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-slate-300">ID</th>
              <th className="px-3 py-2 text-left font-medium text-slate-300">Kind</th>
              <th className="px-3 py-2 text-left font-medium text-slate-300">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900">
            {executions.map((exec) => (
              <tr key={exec.id} className="odd:bg-slate-900/40">
                <td className="px-3 py-2 text-slate-300">{exec.id}</td>
                <td className="px-3 py-2 text-slate-300">{exec.kind}</td>
                <td className="px-3 py-2 text-slate-300">{exec.ok ? 'Succeeded' : 'Pending/Failed'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
