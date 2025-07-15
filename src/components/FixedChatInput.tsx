'use client'

import React, { useRef, useEffect } from 'react'
import { FaPaperPlane, FaPlus } from 'react-icons/fa'

interface FixedChatInputProps {
  input: string
  isLoading: boolean
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onSubmit: (e: React.FormEvent) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onAddCell: () => void
}

export default function FixedChatInput({
  input,
  isLoading,
  onInputChange,
  onSubmit,
  onKeyDown,
  onAddCell,
}: FixedChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [input])

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 p-4">
      <div className="container mx-auto max-w-4xl">
        <form onSubmit={onSubmit} className="flex items-end gap-3">
          {/* Add Cell Button */}
          <button
            type="button"
            onClick={onAddCell}
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium bg-green-500 text-white hover:bg-green-600 transition-colors flex-shrink-0"
            aria-label="Add new cell"
            title="Add new cell"
          >
            <FaPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Cell</span>
          </button>

          {/* Chat Input */}
          <div className="flex-1 flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={onInputChange}
              onKeyDown={onKeyDown}
              placeholder="Ask a question... (Enter to send, Shift+Enter for new line)"
              className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={1}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                !input.trim() || isLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
              aria-label="Send message"
            >
              <FaPaperPlane className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
