'use client'

import { useRef, useEffect } from 'react'
import { useChat, Message } from 'ai/react'
import { FaPaperPlane } from 'react-icons/fa'
import ToolCallDisplay from './ToolCallDisplay'

// Define types for Message parts based on AI SDK
type MessagePart = NonNullable<Message['parts']>[number]
type ToolInvocationPart = Extract<MessagePart, { type: 'tool-invocation' }>

import type { CellData, UpdateCellParams } from '@/ai-functions'
import { executeUpdateCell } from '@/ai-functions/update-cell'

// Component for displaying a single message
const MessageItem = ({ message }: { message: Message }) => {
  // Create a combined array of content and tool invocations to render in order
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
    })
  }

  return <div className="space-y-2">{renderItems}</div>
}

// Component for the list of messages
const MessageList = ({
  messages,
  isLoading,
  messagesEndRef,
}: {
  messages: Message[]
  isLoading: boolean
  messagesEndRef: React.Ref<HTMLDivElement>
}) => (
  <div className="p-4 bg-white min-h-32 max-h-96 overflow-y-auto space-y-3">
    {messages.length === 0 ? (
      <p className="text-gray-500 text-sm">
        Ask me anything about Python, data analysis, or programming concepts!
      </p>
    ) : (
      messages.map((message, index) => (
        <MessageItem key={index} message={message} />
      ))
    )}
    {isLoading && (
      <div className="flex justify-start">
        <div className="bg-gray-100 text-gray-800 max-w-[80%] rounded-lg px-3 py-2">
          <div className="text-sm italic opacity-70">typing...</div>
        </div>
      </div>
    )}
    <div ref={messagesEndRef} />
  </div>
)

// Component for the chat input form
const ChatInput = ({
  input,
  isLoading,
  handleInputChange,
  onSubmit,
  handleKeyDown,
  textareaRef,
}: {
  input: string
  isLoading: boolean
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onSubmit: (e: React.FormEvent) => void
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  textareaRef: React.Ref<HTMLTextAreaElement>
}) => (
  <div className="p-4 bg-gray-50 border-t border-gray-300">
    <form onSubmit={onSubmit} className="flex gap-2 items-end">
      <div className="flex-1">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question... (Enter to send, Shift+Enter for new line)"
          className="text-black w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={1}
          disabled={isLoading}
        />
      </div>
      <button
        type="submit"
        disabled={!input.trim() || isLoading}
        className={`p-2 rounded-lg transition-colors ${
          !input.trim() || isLoading
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer'
        }`}
        aria-label="Send message"
      >
        <FaPaperPlane className="w-4 h-4" />
      </button>
    </form>
    <p className="text-xs text-gray-500 mt-2">
      Press Enter to send, Shift+Enter for new line
    </p>
  </div>
)

// Component for the chat header
const ChatHeader = () => (
  <div className="bg-gray-100 px-4 py-2 border-b border-gray-300">
    <h3 className="text-sm font-medium text-gray-700">AI Assistant</h3>
  </div>
)

interface ChatProps {
  // Props for accessing multiple cells
  cells: CellData[]
  onCellUpdate: (id: string, updates: Partial<CellData>) => void
}

export default function Chat({ cells, onCellUpdate }: ChatProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, input, setInput, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    maxSteps: 5, // Enable multi-step tool calls so AI can continue after receiving function results
    async onToolCall({ toolCall }) {
      // Execute the function call - state is now handled directly in message parts

      try {
        let result: unknown

        if (toolCall.toolName === 'listCells') {
          // Execute listCells with current cells data
          result = cells.map((cell) => ({
            id: cell.id,
            type: cell.type,
            text: cell.text,
            output: cell.output,
          }))
        } else if (toolCall.toolName === 'updateCell') {
          // Execute updateCell using the function from the file
          const params = toolCall.args as UpdateCellParams
          const targetCell = cells.find((cell) => cell.id === params.id)

          if (!targetCell) {
            throw new Error(`Cell with ID "${params.id}" not found`)
          }

          result = await executeUpdateCell(params, {
            onCellCodeChange: (code: string) => {
              onCellUpdate(params.id, { text: code })
            },
            currentCellId: params.id,
          })
        } else {
          throw new Error(`Unknown function: ${toolCall.toolName}`)
        }

        // Function call success state is now handled directly in message parts

        return result
      } catch (error) {
        // Function call failure state is now handled directly in message parts

        throw error
      }
    },
  })

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [input])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    handleSubmit(e)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        // Allow newline for Shift+Enter, Ctrl+Enter, Cmd+Enter
        return
      } else {
        // Send message on plain Enter
        e.preventDefault()
        onSubmit(e as unknown as React.FormEvent)
      }
    }
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <ChatHeader />

      <MessageList
        messages={messages}
        isLoading={isLoading}
        messagesEndRef={messagesEndRef}
      />

      <ChatInput
        input={input}
        isLoading={isLoading}
        handleInputChange={handleInputChange}
        onSubmit={onSubmit}
        handleKeyDown={handleKeyDown}
        textareaRef={textareaRef}
      />
    </div>
  )
}
