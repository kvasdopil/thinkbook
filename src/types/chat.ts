export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  toolInvocations?: ToolInvocation[]
  messageId: string // Unique identifier for each message
}

export interface ToolInvocation {
  toolCallId: string
  toolName: string
  args: Record<string, unknown>
  result?: unknown
}

export type AIFunctionCallStatus =
  | 'in-progress'
  | 'success'
  | 'failure'
  | 'cancelled'

export interface AIFunctionCall {
  id: string
  name: string
  args: Record<string, unknown>
  status: AIFunctionCallStatus
  result?: unknown
  error?: string
}
