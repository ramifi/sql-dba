'use client';

import { HealthBadge } from '@/components/HealthBadge';
import { cn } from '@/components/utils';

export type Issue = {
  id: string;
  title: string;
  severity: number;
  summary: string;
  issueType: string;
};

function severityStatus(severity: number): 'good' | 'warning' | 'critical' {
  if (severity >= 7) return 'critical';
  if (severity >= 4) return 'warning';
  return 'good';
}

export function IssueCard({ issue, onInvestigate }: { issue: Issue; onInvestigate?: (issue: Issue) => void }) {
  return (
    <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold text-white">{issue.title}</div>
        <HealthBadge label={`Severity ${issue.severity.toFixed(1)}`} status={severityStatus(issue.severity)} />
      </div>
      <p className="mt-2 text-sm text-slate-400">{issue.summary}</p>
      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <span className="uppercase tracking-wide text-slate-500">{issue.issueType}</span>
        {onInvestigate ? (
          <button
            type="button"
            onClick={() => onInvestigate(issue)}
            className={cn('rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-blue-500')}
          >
            Investigate
          </button>
        ) : null}
      </div>
    </div>
  );
}
