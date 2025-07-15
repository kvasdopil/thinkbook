'use client'

import { useRef, useEffect, useState } from 'react'
import { useChat, Message } from 'ai/react'
import {
  FaPaperPlane,
  FaCheckCircle,
  FaTimesCircle,
  FaCog,
} from 'react-icons/fa'
import type { AIFunctionCall } from '@/types/chat'
import type { CellData, UpdateCellParams } from '@/ai-functions'
import { executeUpdateCell } from '@/ai-functions/update-cell'

// Component for displaying a single tool call
const ToolCallDisplay = ({
  toolCall,
  functionCall,
}: {
  toolCall: { toolCallId: string; toolName: string; args: unknown }
  functionCall: AIFunctionCall | undefined
}) => {
  const status = functionCall?.status || 'in-progress'
  const args = toolCall.args as Record<string, unknown>

  let text = ''
  if (functionCall?.result)
    text = String(
      typeof functionCall.result === 'string'
        ? functionCall.result
        : JSON.stringify(functionCall.result, null, 2)
    )

  return (
    <div className="flex justify-start">
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 border ${
          status === 'in-progress'
            ? 'bg-blue-50 border-blue-200'
            : status === 'success'
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          {status === 'in-progress' && (
            <FaCog className="w-3 h-3 text-blue-600 animate-spin" />
          )}
          {status === 'success' && (
            <FaCheckCircle className="w-3 h-3 text-green-600" />
          )}
          {status === 'failure' && (
            <FaTimesCircle className="w-3 h-3 text-red-600" />
          )}
          <span className="text-xs font-medium">{toolCall.toolName}()</span>
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

        {functionCall?.error && (
          <div className="text-xs text-red-700">
            <strong>Error:</strong> {functionCall.error}
          </div>
        )}
      </div>
    </div>
  )
}

// Component for displaying a single message
const MessageItem = ({
  message,
  functionCalls,
}: {
  message: Message
  functionCalls: Record<string, AIFunctionCall>
}) => (
  <div className="space-y-2">
    {message.content && (
      <div
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
          <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        </div>
      </div>
    )}

    {message.toolInvocations?.map((toolCall) => (
      <ToolCallDisplay
        key={toolCall.toolCallId}
        toolCall={toolCall}
        functionCall={functionCalls[toolCall.toolCallId]}
      />
    ))}
  </div>
)

// Component for the list of messages
const MessageList = ({
  messages,
  isLoading,
  functionCalls,
  messagesEndRef,
}: {
  messages: Message[]
  isLoading: boolean
  functionCalls: Record<string, AIFunctionCall>
  messagesEndRef: React.Ref<HTMLDivElement>
}) => (
  <div className="p-4 bg-white min-h-32 max-h-96 overflow-y-auto space-y-3">
    {messages.length === 0 ? (
      <p className="text-gray-500 text-sm">
        Ask me anything about Python, data analysis, or programming concepts!
      </p>
    ) : (
      messages.map((message, index) => (
        <MessageItem
          key={index}
          message={message}
          functionCalls={functionCalls}
        />
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
  const [functionCalls, setFunctionCalls] = useState<
    Record<string, AIFunctionCall>
  >({})

  const { messages, input, setInput, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    maxSteps: 5, // Enable multi-step tool calls so AI can continue after receiving function results
    async onToolCall({ toolCall }) {
      // Execute the function call
      const callId = toolCall.toolCallId

      // Set initial state to in-progress
      setFunctionCalls((prev) => ({
        ...prev,
        [callId]: {
          id: callId,
          name: toolCall.toolName,
          args: toolCall.args as Record<string, unknown>,
          status: 'in-progress' as AIFunctionCall['status'],
        },
      }))

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

        // Update state to success
        setFunctionCalls((prev) => ({
          ...prev,
          [callId]: {
            ...prev[callId],
            status: 'success' as AIFunctionCall['status'],
            result,
          },
        }))

        return result
      } catch (error) {
        // Update state to failure
        setFunctionCalls((prev) => ({
          ...prev,
          [callId]: {
            ...prev[callId],
            status: 'failure' as AIFunctionCall['status'],
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        }))

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
        functionCalls={functionCalls}
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
