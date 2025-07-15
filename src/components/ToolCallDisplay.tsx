'use client'

import React from 'react'
import { FaCheckCircle, FaTimesCircle, FaCog } from 'react-icons/fa'
import { Message } from 'ai/react'

// Type for message parts from AI SDK
type MessagePart = NonNullable<Message['parts']>[number]
type ToolInvocationPart = Extract<MessagePart, { type: 'tool-invocation' }>

interface ToolCallDisplayProps {
  part: ToolInvocationPart
}

export default function ToolCallDisplay({ part }: ToolCallDisplayProps) {
  // Extract tool invocation data from the correct AI SDK structure
  const { toolInvocation } = part

  const toolName = toolInvocation.toolName || 'unknown'
  const args = (toolInvocation.args || {}) as Record<string, unknown>

  // Map AI SDK states to component states
  const mapStatus = (state: string) => {
    switch (state) {
      case 'partial-call':
      case 'call':
        return 'in-progress'
      case 'result':
        return 'result'
      default:
        return error ? 'error' : 'in-progress'
    }
  }

  const status = mapStatus(toolInvocation.state)

  // Extract result from toolInvocation
  let text = ''
  if (
    toolInvocation.state === 'result' &&
    'result' in toolInvocation &&
    toolInvocation.result
  ) {
    text = String(
      typeof toolInvocation.result === 'string'
        ? toolInvocation.result
        : JSON.stringify(toolInvocation.result, null, 2)
    )
  }

  // Extract error from toolInvocation (if it exists)
  const error =
    'error' in toolInvocation ? String(toolInvocation.error) : undefined

  return (
    <div className="flex justify-start">
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 border ${
          status === 'in-progress'
            ? 'bg-blue-50 border-blue-200'
            : status === 'result'
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          {status === 'in-progress' && (
            <FaCog className="w-3 h-3 text-blue-600 animate-spin" />
          )}
          {status === 'result' && (
            <FaCheckCircle className="w-3 h-3 text-green-600" />
          )}
          {status === 'error' && (
            <FaTimesCircle className="w-3 h-3 text-red-600" />
          )}
          <span className="text-xs font-medium">{toolName}()</span>
        </div>

        {Object.keys(args).length > 0 && (
          <div className="text-xs text-gray-600 mb-1">
            <strong>Parameters:</strong>{' '}
            <pre className="text-xs whitespace-pre-wrap">
              {JSON.stringify(args, null, 2)}
            </pre>
          </div>
        )}

        {text && (
          <div className="text-xs text-gray-700">
            <strong>Result:</strong>{' '}
            <pre className="whitespace-pre-wrap mt-1">{text}</pre>
          </div>
        )}

        {error && (
          <div className="text-xs text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>
    </div>
  )
}
