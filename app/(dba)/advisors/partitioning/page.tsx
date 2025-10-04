'use client';

import { FormEvent, useState } from 'react';
import { SqlResultGrid } from '@/components/SqlResultGrid';

export default function PartitioningAdvisorPage() {
  const [schemaName, setSchemaName] = useState('dbo');
  const [tableName, setTableName] = useState('');
  const [candidates, setCandidates] = useState<Array<Record<string, unknown>>>([]);
  const [dependencies, setDependencies] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(false);

  async function load(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/advisors/partitioning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schemaName, tableName })
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data = await res.json();
      setCandidates(Array.isArray(data.candidates) ? data.candidates : []);
      setDependencies(Array.isArray(data.dependencies) ? data.dependencies : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-white">Partitioning Advisor</h1>
        <p className="text-sm text-slate-400">Identify large tables and their dependency footprint.</p>
      </header>
      <form onSubmit={load} className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6 md:flex-row md:items-end">
        <label className="flex flex-col text-sm text-slate-300">
          Schema
          <input value={schemaName} onChange={(event) => setSchemaName(event.target.value)} className="mt-1 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-white" />
        </label>
        <label className="flex flex-col text-sm text-slate-300">
          Table
          <input value={tableName} onChange={(event) => setTableName(event.target.value)} className="mt-1 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-white" />
        </label>
        <button type="submit" disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-blue-600/40">
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </form>
      {candidates.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Large Table Candidates</h2>
          <SqlResultGrid rows={candidates} />
        </div>
      ) : null}
      {dependencies.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Dependencies</h2>
          <SqlResultGrid rows={dependencies} />
        </div>
      ) : null}
    </div>
  );
}
