'use client'

import React from 'react'
import { FaCheckCircle, FaCog } from 'react-icons/fa'
import { Message } from 'ai/react'

// Type for message parts from AI SDK
type MessagePart = NonNullable<Message['parts']>[number]
type ToolInvocationPart = Extract<MessagePart, { type: 'tool-invocation' }>

interface ToolCallDisplayProps {
  part: ToolInvocationPart
}

export default function ToolCallDisplay({ part }: ToolCallDisplayProps) {
  // Extract tool invocation data from the AI SDK structure
  const { toolInvocation } = part

  const toolName = toolInvocation?.toolName || 'unknown'
  const args = (toolInvocation?.args || {}) as Record<string, unknown>

  // Determine status based on AI SDK state
  const isComplete = toolInvocation?.state === 'result'
  const isInProgress = !isComplete

  // Extract result text if available
  let resultText = ''
  if (isComplete && 'result' in toolInvocation && toolInvocation.result) {
    resultText = String(
      typeof toolInvocation.result === 'string'
        ? toolInvocation.result
        : JSON.stringify(toolInvocation.result, null, 2)
    )
  }

  return (
    <div className="flex justify-start">
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 border ${
          isInProgress
            ? 'bg-blue-50 border-blue-200'
            : 'bg-green-50 border-green-200'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          {isInProgress && (
            <FaCog className="w-3 h-3 text-blue-600 animate-spin" />
          )}
          {isComplete && <FaCheckCircle className="w-3 h-3 text-green-600" />}
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

        {resultText && (
          <div className="text-xs text-gray-700">
            <strong>Result:</strong>{' '}
            <pre className="whitespace-pre-wrap mt-1">{resultText}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
