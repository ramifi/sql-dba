'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSessionStore } from '@/lib/state/useSessionStore';
import { ChatTranscript } from '@/components/ChatTranscript';
import { ConfirmPlanDialog } from '@/components/ConfirmPlanDialog';

export default function IssueDetailPage() {
  const params = useParams<{ issueId: string }>();
  const { transcript, runAgentTick, loading, proposedFixes, approvePlan, currentSessionId } = useSessionStore((state) => ({
    transcript: state.transcript,
    runAgentTick: state.runAgentTick,
    loading: state.loading,
    proposedFixes: state.proposedFixes,
    approvePlan: state.approvePlan,
    currentSessionId: state.currentSessionId
  }));

  useEffect(() => {
    if (!currentSessionId) {
      console.warn('No active session; start from Top Issues page.');
    }
  }, [currentSessionId]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Issue {params.issueId}</h1>
          <p className="text-sm text-slate-400">Agent-assisted diagnostics and remediation planning.</p>
        </div>
        <button
          type="button"
          disabled={loading || !currentSessionId}
          onClick={() => runAgentTick()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-blue-600/40"
        >
          {loading ? 'Running...' : 'Run Agent Loop'}
        </button>
      </header>
      <section>
        <ChatTranscript messages={transcript} />
      </section>
      {proposedFixes.length > 0 ? (
        <ConfirmPlanDialog plan={proposedFixes} onApprove={(plan) => approvePlan(plan)} />
      ) : null}
    </div>
  );
}
