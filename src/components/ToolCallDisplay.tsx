'use client'

import React from 'react'
import { Message } from 'ai/react'
import ToolCallIcon from './ToolCallIcon'

// Type for message parts from AI SDK
type MessagePart = NonNullable<Message['parts']>[number]
type ToolInvocationPart = Extract<MessagePart, { type: 'tool-invocation' }>

interface ToolCallDisplayProps {
  part: ToolInvocationPart
}

export default function ToolCallDisplay({ part }: ToolCallDisplayProps) {
  // Extract tool invocation data from the correct AI SDK structure
  const { toolInvocation } = part

  return <ToolCallIcon toolCall={toolInvocation} />
}
