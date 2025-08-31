import { MessageTextPart } from './MessageTextPart';

interface ChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    parts: { type: 'text'; text: string }[];
  };
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        <div className="text-sm font-medium mb-1">
          {isUser ? 'You' : 'Assistant'}
        </div>
        <div>
          {message.parts?.map((part, index) => {
            if (part.type === 'text') {
              return <MessageTextPart key={index} part={part} />;
            }
            return null;
          })}
        </div>
      </div>
    </div>
  );
}