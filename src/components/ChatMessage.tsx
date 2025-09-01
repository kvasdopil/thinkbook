import { MessageTextPart } from './MessageTextPart';
import { MessageToolCallPart } from './MessageToolCallPart';

interface SimpleMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolInvocations?: Array<{
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
    result?: unknown;
    state: 'partial-call' | 'result';
  }>;
}

interface ChatMessageProps {
  message: SimpleMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="bg-blue-600 text-white rounded-lg px-2 py-1 max-w-3xl">
          <MessageTextPart part={{ type: 'text', text: message.content }} />
        </div>
      </div>
    );
  }

  // Assistant message with tool calls and text
  return (
    <div>
      {/* Render tool invocations */}
      <div className="flex flex-row gap-2">
        {message.toolInvocations?.map((toolInvocation, index) => (
          <MessageToolCallPart
            key={index}
            toolCallId={toolInvocation.toolCallId}
            toolName={toolInvocation.toolName}
            args={toolInvocation.args}
            result={toolInvocation.result}
            status={
              toolInvocation.state === 'result' ? 'success' : 'in-progress'
            }
          />
        ))}
      </div>

      {/* Render message content */}
      {message.content && (
        <MessageTextPart part={{ type: 'text', text: message.content }} />
      )}
    </div>
  );
}
