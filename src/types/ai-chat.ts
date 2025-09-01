export interface MessagePart {
  type: 'text' | 'tool-call' | 'tool-result';
  text?: string;
  toolCallId?: string;
  toolName?: string;
  args?: Record<string, unknown>;
  result?: unknown;
  status?: 'pending' | 'in-progress' | 'success' | 'error' | 'cancelled';
}

export interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  state: 'partial-call' | 'result';
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  parts?: MessagePart[];
  content?: string;
  toolInvocations?: ToolInvocation[];
}