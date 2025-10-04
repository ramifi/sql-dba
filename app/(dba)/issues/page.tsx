'use client';

import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { IssueList } from '@/components/IssueList';
import type { Issue } from '@/components/IssueCard';
import { useSessionStore } from '@/lib/state/useSessionStore';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function IssuesPage() {
  const router = useRouter();
  const startSession = useSessionStore((state) => state.startSession);
  const { data } = useSWR<{ issues: Issue[] }>('/api/issues/top', fetcher, { refreshInterval: 60_000 });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-white">Top Issues</h1>
        <p className="text-sm text-slate-400">Prioritized by severity using live metrics.</p>
      </header>
      <IssueList
        issues={data?.issues ?? []}
        onInvestigate={async (issue) => {
          await startSession(issue.issueType, issue.title);
          router.push(`/issues/${issue.id}`);
        }}
      />
    </div>
  );
}
