'use client';

import { useState } from 'react';
import type { ProposedFix } from '@/lib/ai/schema';

export function ConfirmPlanDialog({ plan, onApprove }: { plan: ProposedFix[]; onApprove: (plan: ProposedFix[]) => void }) {
  const [ack, setAck] = useState(false);
  return (
    <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-6">
      <h3 className="text-lg font-semibold text-white">Proposed Remediation Plan</h3>
      <div className="mt-4 space-y-4">
        {plan.map((fix) => (
          <div key={fix.title} className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
            <div className="text-base font-semibold text-white">{fix.title}</div>
            <p className="mt-1 text-sm text-slate-400">{fix.summary}</p>
            <div className="mt-2 text-sm text-slate-300">
              <div className="font-medium text-slate-200">Steps</div>
              <ul className="list-inside list-disc space-y-1">
                {fix.steps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ul>
              {fix.risks.length > 0 ? (
                <div className="mt-3">
                  <div className="font-medium text-slate-200">Risks</div>
                  <ul className="list-inside list-disc space-y-1 text-amber-200">
                    {fix.risks.map((risk, idx) => (
                      <li key={idx}>{risk}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {fix.rollback.length > 0 ? (
                <div className="mt-3">
                  <div className="font-medium text-slate-200">Rollback</div>
                  <ul className="list-inside list-disc space-y-1 text-sky-200">
                    {fix.rollback.map((rollback, idx) => (
                      <li key={idx}>{rollback}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" className="h-4 w-4" checked={ack} onChange={(event) => setAck(event.target.checked)} />
        I understand this plan executes as a dry-run only and requires manual review before production changes.
      </label>
      <button
        type="button"
        disabled={!ack}
        onClick={() => onApprove(plan)}
        className="mt-4 inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-emerald-600/40"
      >
        Approve Dry-Run
      </button>
    </div>
  );
}
