'use client';

import { cn } from '@/components/utils';

export function HealthBadge({ label, status }: { label: string; status: 'good' | 'warning' | 'critical' }) {
  const color = status === 'good' ? 'bg-emerald-500/20 text-emerald-300' : status === 'warning' ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300';
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', color)}>{label}</span>;
}
