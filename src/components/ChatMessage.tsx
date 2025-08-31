import { MessageTextPart } from './MessageTextPart';
import { FaDatabase, FaChartLine, FaCheck, FaExpand } from 'react-icons/fa';

interface ChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    parts: { type: 'text'; text: string }[];
  };
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="bg-blue-600 text-white rounded-lg px-2 py-1 max-w-3xl">
          {message.parts?.map((part, index) => {
            if (part.type === 'text') {
              return <MessageTextPart key={index} part={part} />;
            }
            return null;
          })}
        </div>
      </div>
    );
  }

  // Assistant message with tool call indicators and expanded layout
  return (
    <div className="space-y-6 max-w-full">
      <div className="flex items-center space-x-2">
        <p>
          I'll analyze your request and provide insights. Let me process the
          data:
        </p>
        <div className="flex items-center space-x-1">
          <div className="tool-call-icon relative group">
            <FaDatabase className="text-gray-400 hover:text-gray-600 text-sm cursor-help" />
            <div className="tool-call-tooltip absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              database_query
            </div>
          </div>
          <div className="tool-call-icon relative group">
            <FaChartLine className="text-gray-400 hover:text-gray-600 text-sm cursor-help" />
            <div className="tool-call-tooltip absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              create_chart
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-start space-x-3">
        <div className="inline-flex items-center bg-white border border-gray-200 rounded-lg px-3 py-2 max-w-sm">
          <button className="status-btn w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-3 text-xs hover:bg-green-200 transition-colors">
            <FaCheck />
          </button>
          <span className="text-sm font-medium text-gray-700 flex-1 truncate">
            Process data request
          </span>
          <button className="expand-btn ml-2 text-gray-400 hover:text-gray-600 transition-colors">
            <FaExpand className="text-xs" />
          </button>
        </div>
      </div>
      <div className="ml-9 bg-gray-900 text-gray-100 rounded-lg p-3 font-mono text-sm">
        <div className="text-green-400">
          ✓ Processing completed successfully
        </div>
        <div className="text-blue-300">Data analyzed and visualized</div>
        <div className="text-gray-300">Ready to display results</div>
      </div>

      {message.parts?.map((part, index) => {
        if (part.type === 'text') {
          return <MessageTextPart key={index} part={part} />;
        }
        return null;
      })}
    </div>
  );
}
