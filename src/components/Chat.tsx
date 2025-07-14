'use client'

import { useRef, useEffect } from 'react'
import { useChat } from 'ai/react'
import { FaPaperPlane } from 'react-icons/fa'

export default function Chat() {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, input, setInput, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
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
    <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <div className="bg-gray-100 px-4 py-2 border-b border-gray-300">
          <h3 className="text-sm font-medium text-gray-700">AI Assistant</h3>
        </div>

        {/* Chat History */}
        <div className="p-4 bg-white min-h-32 max-h-96 overflow-y-auto space-y-3">
          {messages.length === 0 ? (
            <p className="text-gray-500 text-sm">
              Ask me anything about Python, data analysis, or programming
              concepts!
            </p>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
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
                  <div className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </div>
                </div>
              </div>
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

        {/* Input Area */}
        <div className="p-4 bg-gray-50 border-t border-gray-300">
          <form onSubmit={onSubmit} className="flex gap-2 items-end">
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question... (Enter to send, Shift+Enter for new line)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
      </div>
    </div>
  )
}
