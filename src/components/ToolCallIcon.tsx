import React, { useState } from 'react';
import { FaCheckCircle, FaTimesCircle, FaSpinner, FaMinusCircle } from 'react-icons/fa';
import { ToolInvocation } from 'ai';

type ToolCallIconProps = {
  toolCall: ToolInvocation;
};

const ToolCallIcon: React.FC<ToolCallIconProps> = ({ toolCall }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const { toolName, args, result, error } = toolCall;

  const getStatus = () => {
    if (error) return 'failure';
    if (result) return 'success';
    // Simplified logic: how to determine 'cancelled' is not clear from the provided data
    return 'in-progress';
  };

  const status = getStatus();

  const getIcon = () => {
    switch (status) {
      case 'success':
        return <FaCheckCircle className="text-green-500" />;
      case 'failure':
        return <FaTimesCircle className="text-red-500" />;
      case 'in-progress':
        return <FaSpinner className="text-blue-500 animate-spin" />;
      case 'cancelled':
        return <FaMinusCircle className="text-orange-500" />;
      default:
        return null;
    }
  };

  const getTooltip = () => {
    return `${toolName} (${status})`;
  };

  return (
    <div className="inline-block mx-1">
      <div
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        title={getTooltip()}
      >
        {getIcon()}
      </div>
      {isExpanded && (
        <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded w-full">
          <pre className="text-xs whitespace-pre-wrap">
            <code>
              <strong>Tool:</strong> {toolName}
              <br />
              <strong>Arguments:</strong> {JSON.stringify(args, null, 2)}
              <br />
              {result && <><strong>Result:</strong> {JSON.stringify(result, null, 2)}</>}
              {error && <><strong>Error:</strong> {error}</>}
            </code>
          </pre>
        </div>
      )}
    </div>
  );
};

export default ToolCallIcon;
