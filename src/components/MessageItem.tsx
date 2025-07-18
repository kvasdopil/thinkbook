'use client'

import React from 'react'
import { Message } from 'ai/react'
import ToolCallDisplay from './ToolCallDisplay'
import ReactMarkdown from 'react-markdown'
import { MarkdownComponents } from './MarkdownComponents'

// Type for message parts from AI SDK
type MessagePart = NonNullable<Message['parts']>[number]
type ToolInvocationPart = Extract<MessagePart, { type: 'tool-invocation' }>

interface MessageItemProps {
  message: Message
}

export default function MessageItem({ message }: MessageItemProps) {
  const renderItems: React.ReactNode[] = []

  if (
    message.parts &&
    message.parts.length === 1 &&
    message.parts[0].type === 'step-start'
  ) {
    return <div className="text-sm text-gray-500">_</div>
  }

  // Always use message.parts array to maintain chronological order
  if (message.parts && message.parts.length > 0) {
    // We will iterate over parts in order, collecting consecutive tool-invocation
    // parts so they can be rendered together in a single inline flex container.

    const flushToolGroup = (group: ToolInvocationPart[], key: string) => {
      if (group.length === 0) return null
      return (
        <div key={key} className="flex items-center space-x-2">
          {group.map((toolPart, index) => (
            <ToolCallDisplay
              key={`tool-${index}-${toolPart.toolInvocation.toolCallId}`}
              part={toolPart}
            />
          ))}
        </div>
      )
    }

    let currentToolGroup: ToolInvocationPart[] = []

    message.parts!.forEach((part, index) => {
      if (part.type === 'tool-invocation') {
        currentToolGroup.push(part as ToolInvocationPart)
        // If it is the last part, flush the group now.
        if (index === message.parts!.length - 1) {
          const groupElement = flushToolGroup(
            currentToolGroup,
            `tool-group-${index}`
          )
          if (groupElement) renderItems.push(groupElement)
        }
        return
      }

      // If we hit a non tool-invocation part, flush any accumulated group first.
      const groupElement = flushToolGroup(
        currentToolGroup,
        `tool-group-${index}`
      )
      if (groupElement) renderItems.push(groupElement)
      currentToolGroup = []

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
                  : 'bg-transparent text-gray-800'
              }`}
            >
              <div className="text-sm">
                <ReactMarkdown components={MarkdownComponents}>
                  {part.text}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )
      }
      // Ignore other part types like 'step-start'
    })
  }

  return <div className="space-y-2">{renderItems}</div>
}
