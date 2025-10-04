'use client';

import { useCallback } from 'react';
import { Copy } from 'lucide-react';

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  ts: string;
  toolName?: string;
};

const roleStyles: Record<ChatMessage['role'], string> = {
  user: 'border-blue-600/40 bg-blue-600/10',
  assistant: 'border-emerald-600/40 bg-emerald-600/10',
  system: 'border-slate-600/40 bg-slate-700/20',
  tool: 'border-amber-500/40 bg-amber-500/10'
};

export function ChatTranscript({ messages }: { messages: ChatMessage[] }) {
  const copy = useCallback((text: string) => {
    void navigator.clipboard.writeText(text);
  }, []);
  return (
    <div className="space-y-3">
      {messages.map((msg, idx) => (
        <div key={`${msg.ts}-${idx}`} className={`rounded-xl border ${roleStyles[msg.role]} p-4`}> 
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium uppercase tracking-wide">{msg.role}{msg.toolName ? ` · ${msg.toolName}` : ''}</span>
            <button type="button" className="flex items-center gap-1 text-slate-400 hover:text-slate-200" onClick={() => copy(msg.content)}>
              <Copy className="h-3 w-3" /> Copy
            </button>
          </div>
          <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-100">{msg.content}</pre>
          <div className="mt-2 text-right text-xs text-slate-500">{new Date(msg.ts).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}
