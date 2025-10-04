'use client';

import { cn } from '@/components/utils';

export function MetricCard({ title, value, trend, className }: { title: string; value: string; trend?: string; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm', className)}>
      <div className="text-sm text-slate-400">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      {trend ? <div className="mt-1 text-xs text-slate-500">{trend}</div> : null}
    </div>
  );
}
