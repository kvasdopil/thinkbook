import { useState } from 'react';
import {
  // FaCheck,
  // FaSpinner,
  // FaTimes,
  // FaExclamationTriangle,
  // FaExpand,
  // FaCompress,
  FaDatabase,
  FaEdit,
  FaPlus,
} from 'react-icons/fa';

interface MessageToolCallPartProps {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  status: 'pending' | 'in-progress' | 'success' | 'error' | 'cancelled';
}

export function MessageToolCallPart({
  toolCallId,
  toolName,
  args,
  result,
  status,
}: MessageToolCallPartProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // const getStatusIcon = () => {
  //   switch (status) {
  //     case 'pending':
  //     case 'in-progress':
  //       return <FaSpinner className="animate-spin" />;
  //     case 'success':
  //       return <FaCheck />;
  //     case 'error':
  //       return <FaTimes />;
  //     case 'cancelled':
  //       return <FaExclamationTriangle />;
  //     default:
  //       return <FaSpinner />;
  //   }
  // };

  const getStatusColor = () => {
    switch (status) {
      case 'pending':
      case 'in-progress':
        return 'text-blue-600';
      case 'success':
        return 'text-gray-400';
      case 'error':
        return 'text-red-600';
      case 'cancelled':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  const getToolIcon = () => {
    switch (toolName) {
      case 'listCells':
        return <FaDatabase className="text-xs" />;
      case 'updateCell':
        return <FaEdit className="text-xs" />;
      case 'createCodeCell':
        return <FaPlus className="text-xs" />;
      default:
        return null;
    }
  };

  // const getToolDisplayName = () => {
  //   switch (toolName) {
  //     case 'listCells':
  //       return 'List Cells';
  //     case 'updateCell':
  //       return `Update Cell ${(args as { id?: string })?.id || ''}`;
  //     case 'createCodeCell':
  //       return 'Create Code Cell';
  //     default:
  //       return toolName;
  //   }
  // };

  return (
    <>
      <div className="flex items-start space-x-3">
        <button
          className="inline-flex items-center p-1"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div
            className={`flex items-center space-x-2 flex-1 min-w-0 ${getStatusColor()} hover:opacity-80 transition-opacity cursor-pointer`}
          >
            {getToolIcon()}
            {/* <span className="text-sm font-medium">{getToolDisplayName()}</span> */}
          </div>
        </button>
      </div>

      {isExpanded && (
        <div className="bg-gray-900 text-gray-100 rounded-lg p-3 font-mono text-sm">
          <div className="space-y-2">
            <div>
              <span className="text-blue-300">Function:</span>{' '}
              <span className="text-green-400">{toolName}</span>
            </div>

            {Object.keys(args || {}).length > 0 && (
              <div>
                <span className="text-blue-300">Arguments:</span>
                <pre className="text-yellow-300 mt-1 text-xs">
                  {JSON.stringify(args, null, 2)}
                </pre>
              </div>
            )}

            {result !== undefined && (
              <div>
                <span className="text-blue-300">Result:</span>
                <pre className="text-green-300 mt-1 text-xs overflow-auto max-h-40">
                  {(() => {
                    try {
                      return typeof result === 'string'
                        ? result
                        : JSON.stringify(result, null, 2);
                    } catch {
                      return '[Unable to display result]';
                    }
                  })()}
                </pre>
              </div>
            )}

            <div className="text-xs text-gray-400">Call ID: {toolCallId}</div>
          </div>
        </div>
      )}
    </>
  );
}
