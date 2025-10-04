'use client';

import { create } from 'zustand';
import { ProposedFix } from '@/lib/ai/schema';

type TranscriptItem = {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  ts: string;
  toolName?: string;
};

type ExecutionItem = {
  id: number;
  kind: string;
  ok: boolean;
};

type SessionState = {
  currentSessionId: string | null;
  issueType: string | null;
  transcript: TranscriptItem[];
  executions: ExecutionItem[];
  dashboard: unknown;
  proposedFixes: ProposedFix[];
  loading: boolean;
  startSession(issueType: string, title?: string): Promise<void>;
  runAgentTick(): Promise<void>;
  approvePlan(plan: ProposedFix[]): Promise<void>;
  refreshDashboard(): Promise<void>;
};

async function handleResponse(response: Response) {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Request failed');
  }
  return response.json();
}

export const useSessionStore = create<SessionState>((set, get) => ({
  currentSessionId: null,
  issueType: null,
  transcript: [],
  executions: [],
  dashboard: null,
  proposedFixes: [],
  loading: false,
  async startSession(issueType, title) {
    set({ loading: true });
    const payload = { issueType, context: { title } };
    const response = await fetch('/api/agent/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await handleResponse(response);
    set({
      currentSessionId: data.sessionId,
      issueType,
      transcript: data.transcript ?? [],
      executions: data.executions ?? [],
      proposedFixes: data.proposedFixes ?? [],
      loading: false
    });
  },
  async runAgentTick() {
    const { currentSessionId, issueType } = get();
    if (!currentSessionId || !issueType) return;
    set({ loading: true });
    const response = await fetch('/api/agent/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: currentSessionId, issueType })
    });
    const data = await handleResponse(response);
    set({
      transcript: data.transcript ?? [],
      executions: data.executions ?? [],
      proposedFixes: data.proposedFixes ?? [],
      loading: false
    });
  },
  async approvePlan(plan) {
    const { currentSessionId } = get();
    if (!currentSessionId) return;
    const response = await fetch('/api/plan/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: currentSessionId, plan })
    });
    await handleResponse(response);
    await get().runAgentTick();
  },
  async refreshDashboard() {
    const response = await fetch('/api/metrics/overview');
    const data = await handleResponse(response);
    set({ dashboard: data });
  }
}));
