'use client'

import React from 'react'
import { Message } from 'ai/react'
import ToolCallDisplay from './ToolCallDisplay'

// Type for message parts from AI SDK
type MessagePart = NonNullable<Message['parts']>[number]
type ToolInvocationPart = Extract<MessagePart, { type: 'tool-invocation' }>

interface MessageItemProps {
  message: Message
}

export default function MessageItem({ message }: MessageItemProps) {
  const renderItems: React.ReactNode[] = []

  // Always use message.parts array to maintain chronological order
  if (message.parts && message.parts.length > 0) {
    message.parts.forEach((part, index) => {
      if (part.type === 'text' && part.text) {
        renderItems.push(
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
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">{part.text}</div>
            </div>
          </div>
        )
      } else if (part.type === 'tool-invocation') {
        // Use the part directly as it already has the correct ToolInvocationPart structure
        const toolPart = part as ToolInvocationPart
        renderItems.push(
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
