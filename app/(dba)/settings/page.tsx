'use client';

export default function SettingsPage() {
  const envConfigured = Boolean(process.env.NEXT_PUBLIC_BASE_URL);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-white">Settings &amp; Safety</h1>
        <p className="text-sm text-slate-400">Connection details are sourced from server-side environment variables.</p>
      </header>
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
        <p><span className="font-semibold text-slate-100">MSSQL Server:</span> {process.env.MSSQL_SERVER ? 'Configured' : 'Missing'}</p>
        <p><span className="font-semibold text-slate-100">OpenAI API:</span> {process.env.OPENAI_API_KEY ? 'Enabled' : 'Disabled'}</p>
        <p><span className="font-semibold text-slate-100">Public Base URL:</span> {envConfigured ? process.env.NEXT_PUBLIC_BASE_URL : 'Not set'}</p>
        <p className="mt-4 text-xs text-slate-500">All SQL issued through this console enforces read-only guards and dry-run enforcement for plans.</p>
      </div>
    </div>
  );
}
