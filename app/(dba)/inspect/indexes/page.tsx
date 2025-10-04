'use client';

import { FormEvent, useState } from 'react';
import { SqlResultGrid } from '@/components/SqlResultGrid';

export default function IndexInspectorPage() {
  const [schemaName, setSchemaName] = useState('dbo');
  const [tableName, setTableName] = useState('');
  const [results, setResults] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(false);

  async function inspect(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/inspect/indexes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schemaName, tableName })
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-white">Index Inspector</h1>
        <p className="text-sm text-slate-400">Understand index structures, usage, and fragmentation.</p>
      </header>
      <form onSubmit={inspect} className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6 md:flex-row md:items-end">
        <label className="flex flex-col text-sm text-slate-300">
          Schema
          <input value={schemaName} onChange={(event) => setSchemaName(event.target.value)} className="mt-1 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-white" />
        </label>
        <label className="flex flex-col text-sm text-slate-300">
          Table
          <input value={tableName} onChange={(event) => setTableName(event.target.value)} className="mt-1 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-white" />
        </label>
        <button type="submit" disabled={!tableName || loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-blue-600/40">
          {loading ? 'Inspecting...' : 'Inspect'}
        </button>
      </form>
      {results.length > 0 ? <SqlResultGrid rows={results} /> : null}
    </div>
  );
}
