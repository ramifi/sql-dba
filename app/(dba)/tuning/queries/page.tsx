'use client';

import { FormEvent, useState } from 'react';
import { SqlResultGrid } from '@/components/SqlResultGrid';

export default function QueryTunerPage() {
  const [queryId, setQueryId] = useState('');
  const [queryHash, setQueryHash] = useState('');
  const [results, setResults] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(false);

  async function load(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const body: Record<string, unknown> = {};
      if (queryId) body.queryId = Number(queryId);
      if (queryHash) body.queryHash = queryHash;
      const res = await fetch('/api/inspect/query-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
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
        <h1 className="text-3xl font-semibold text-white">Query Tuner</h1>
        <p className="text-sm text-slate-400">Pull Query Store insights for targeted tuning.</p>
      </header>
      <form onSubmit={load} className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6 md:flex-row md:items-end">
        <label className="flex flex-col text-sm text-slate-300">
          Query ID
          <input value={queryId} onChange={(event) => setQueryId(event.target.value)} className="mt-1 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-white" />
        </label>
        <label className="flex flex-col text-sm text-slate-300">
          Query Hash
          <input value={queryHash} onChange={(event) => setQueryHash(event.target.value)} className="mt-1 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-white" />
        </label>
        <button type="submit" disabled={loading || (!queryId && !queryHash)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-blue-600/40">
          {loading ? 'Loading...' : 'Load Query'}
        </button>
      </form>
      {results.length > 0 ? <SqlResultGrid rows={results} /> : null}
    </div>
  );
}
