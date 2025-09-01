import {
  type UIMessage,
  isToolOrDynamicToolUIPart,
  getToolOrDynamicToolName,
} from 'ai';
import { MessageTextPart } from './MessageTextPart';
import { MessageToolCallPart } from './MessageToolCallPart';

interface ChatMessageProps {
  message: UIMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  // Helper functions to work with message parts
  const isTextPart = (
    part: unknown,
  ): part is { type: 'text'; text: string } => {
    return (
      typeof part === 'object' &&
      part !== null &&
      (part as { type?: unknown }).type === 'text' &&
      typeof (part as { text?: unknown }).text === 'string'
    );
  };

  if (isUser) {
    // For user messages, combine all text parts
    const content = message.parts
      .filter((p) => isTextPart(p))
      .map((p) => p.text)
      .join('');

    return (
      <div className="flex justify-end">
        <div className="bg-blue-600 text-white rounded-lg px-2 py-1 max-w-3xl">
          <MessageTextPart part={{ type: 'text', text: content }} />
        </div>
      </div>
    );
  }

  // Assistant message with tool calls and text
  const textContent = message.parts
    .filter((p) => isTextPart(p))
    .map((p) => p.text)
    .join('');

  const toolParts = message.parts.filter(isToolOrDynamicToolUIPart);

  return (
    <div>
      {/* Render tool calls */}
      {toolParts.length > 0 && (
        <div className="flex flex-row gap-2">
          {toolParts.map((part, index) => {
            const toolName = getToolOrDynamicToolName(part);
            const status =
              part.state === 'output-available' ? 'success' : 'in-progress';
            const args = (part.input ?? {}) as Record<string, unknown>;
            const result =
              part.state === 'output-available' ? part.output : undefined;

            return (
              <MessageToolCallPart
                key={index}
                toolCallId={part.toolCallId}
                toolName={toolName}
                args={args}
                result={result}
                status={status}
              />
            );
          })}
        </div>
      )}

      {/* Render text content */}
      {textContent && (
        <MessageTextPart part={{ type: 'text', text: textContent }} />
      )}
    </div>
  );
}
