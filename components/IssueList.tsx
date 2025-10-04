'use client';

import { Issue, IssueCard } from '@/components/IssueCard';

export function IssueList({ issues, onInvestigate }: { issues: Issue[]; onInvestigate?: (issue: Issue) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {issues.map((issue) => (
        <IssueCard key={issue.id} issue={issue} onInvestigate={onInvestigate} />
      ))}
    </div>
  );
}
