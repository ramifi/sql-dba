'use client';

import { useMemo } from 'react';

export function SqlResultGrid({ rows }: { rows: Array<Record<string, unknown>> }) {
  const columns = useMemo(() => (rows[0] ? Object.keys(rows[0]) : []), [rows]);
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="min-w-full divide-y divide-slate-800 text-sm">
        <thead className="bg-slate-900/80">
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-3 py-2 text-left font-medium text-slate-300">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-900">
          {rows.map((row, idx) => (
            <tr key={idx} className="odd:bg-slate-900/40">
              {columns.map((col) => (
                <td key={col} className="whitespace-nowrap px-3 py-2 text-slate-300">
                  {String(row[col] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
