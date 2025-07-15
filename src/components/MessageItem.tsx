'use client'

import React from 'react'
import { Message } from 'ai/react'
import ToolCallDisplay from './ToolCallDisplay'
import ReactMarkdown from 'react-markdown'

// Type for message parts from AI SDK
type MessagePart = NonNullable<Message['parts']>[number]
type ToolInvocationPart = Extract<MessagePart, { type: 'tool-invocation' }>

interface MessageItemProps {
  message: Message
}

export default function MessageItem({ message }: MessageItemProps) {
  let renderItems: React.ReactNode[] = []

  if (
    message.parts &&
    message.parts.length === 1 &&
    message.parts[0].type === 'step-start'
  ) {
    return <div className="text-sm text-gray-500">_</div>
  }

  // Always use message.parts array to maintain chronological order
  if (message.parts && message.parts.length > 0) {
    renderItems = message.parts.map((part, index) => {
      if (part.type === 'text' && part.text) {
        return (
          <div
            key={`text-${index}`}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  // AI responses should have a transparent background and no border
                  : 'bg-transparent text-gray-800'
              }`}
            >
              <div className="text-sm markdown-content">
                <ReactMarkdown>{part.text}</ReactMarkdown>
              </div>
            </div>
          </div>
        )
      }

      if (part.type === 'tool-invocation') {
        // Use the part directly as it already has the correct ToolInvocationPart structure
        const toolPart = part as ToolInvocationPart
        return (
          <ToolCallDisplay
            key={`tool-${index}-${toolPart.toolInvocation.toolCallId}`}
            part={toolPart}
          />
        )
      }
      // Ignore other part types like 'step-start' - they don't need visual representation
    })
  }

  return <div className="space-y-2">{renderItems}</div>
}
