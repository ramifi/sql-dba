export type ToolContext = {
  sessionId: string;
};

export type ToolResult = {
  ok: boolean;
  data?: unknown;
  error?: string;
};
