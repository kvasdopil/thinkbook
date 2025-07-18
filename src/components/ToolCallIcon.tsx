import React, { useState } from 'react'
import {
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaMinusCircle,
} from 'react-icons/fa'
import { ToolInvocation } from 'ai'

type ToolCallIconProps = {
  toolCall: ToolInvocation
}

const ToolCallIcon: React.FC<ToolCallIconProps> = ({ toolCall }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const { toolName, args, result, error } = toolCall as ToolInvocation & {
    result: unknown
    error?: string
  }

  const mapStatus = (state?: string) => {
    switch (state) {
      case 'call':
        return 'in-progress'
      case 'result':
        return error ? 'failure' : 'success'
      case 'error':
        return 'failure'
      case 'cancelled':
        return 'cancelled'
      default:
        return 'in-progress'
    }
  }

  const status = mapStatus(toolCall.state)

  const getIcon = () => {
    switch (status) {
      case 'success':
        return <FaCheckCircle className="text-green-600" />
      case 'failure':
        return <FaTimesCircle className="text-red-600" />
      case 'in-progress':
        return <FaSpinner className="text-blue-600 animate-spin" />
      case 'cancelled':
        return <FaMinusCircle className="text-orange-600" />
      default:
        return null
    }
  }

  const getTooltip = () => {
    return `${toolName} (${status})`
  }

  return (
    <div className="inline-block mx-1">
      <div
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) =>
          (e.key === 'Enter' || e.key === ' ') && setIsExpanded(!isExpanded)
        }
        role="button"
        tabIndex={0}
        title={getTooltip()}
      >
        {getIcon()}
      </div>
      {isExpanded && (
        <div className="mt-2 p-2 bg-gray-100 rounded-md w-full">
          <pre className="text-xs whitespace-pre-wrap">
            <code>
              <strong>Request parameters:</strong>
              <br />
              {JSON.stringify(args, null, 2)}
              <br />
              <strong>Result:</strong>
              <br />
              {result && <>{JSON.stringify(result, null, 2)}</>}
              {error && <>{error}</>}
            </code>
          </pre>
        </div>
      )}
    </div>
  )
}

export default ToolCallIcon
