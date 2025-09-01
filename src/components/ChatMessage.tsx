import {
  isToolOrDynamicToolUIPart,
  getToolOrDynamicToolName,
} from 'ai';
import { useState, useRef, useEffect } from 'react';
import { FaPaperPlane, FaTimes } from 'react-icons/fa';
import { MessageTextPart } from './MessageTextPart';
import { MessageToolCallPart } from './MessageToolCallPart';
import { useEditStore } from '../store/editStore';
import type { MessageWithId } from '../hooks/useEditableChat';

interface ChatMessageProps {
  message: MessageWithId;
  messageIndex: number;
  editingMessageIndex: number;
  onStartEdit: (messageId: string) => void;
  onCancelEdit: () => void;
  onSendEdit: (messageId: string, newText: string) => void;
}

export function ChatMessage({ 
  message, 
  messageIndex, 
  editingMessageIndex,
  onStartEdit, 
  onCancelEdit, 
  onSendEdit 
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const { editingMessageId } = useEditStore();
  const [editText, setEditText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isEditing = editingMessageId === message.id;
  const isAfterEditingMessage = editingMessageId && editingMessageIndex !== -1 && messageIndex > editingMessageIndex;

  // Initialize edit text when entering edit mode
  useEffect(() => {
    if (isEditing && isUser) {
      const content = message.parts
        .filter((p) => isTextPart(p))
        .map((p) => p.text)
        .join('');
      setEditText(content);
      // Focus textarea after it's rendered
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [isEditing, isUser, message.parts]);

  // Handle keyboard events
  useEffect(() => {
    if (!isEditing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancelEdit();
      }
      // Handle Tab navigation within edit mode
      if (e.key === 'Tab' && textareaRef.current?.contains(document.activeElement as Node)) {
        e.preventDefault();
        const sendButton = textareaRef.current?.parentElement?.querySelector('[data-send-button]') as HTMLElement;
        sendButton?.focus();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (textareaRef.current && !textareaRef.current.contains(target)) {
        // Don't close if clicking on Send or Cancel buttons
        if (!target.closest('[data-edit-buttons]')) {
          onCancelEdit();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing, onCancelEdit]);

  const handleSend = () => {
    if (editText.trim()) {
      onSendEdit(message.id, editText.trim());
    }
  };

  const handleCancel = () => {
    onCancelEdit();
  };

  const handleUserMessageClick = () => {
    if (isUser && !isEditing) {
      onStartEdit(message.id);
    }
  };

  // Helper functions to work with message parts
  const isTextPart = (
    part: unknown,
  ): part is { type: 'text'; text: string } => {
    return (
      typeof part === 'object' &&
      part !== null &&
      (part as { type?: unknown }).type === 'text' &&
      typeof (part as { text?: unknown }).text === 'string'
    );
  };

  if (isUser) {
    // For user messages, combine all text parts
    const content = message.parts
      .filter((p) => isTextPart(p))
      .map((p) => p.text)
      .join('');

    return (
      <div className={`flex justify-end ${isAfterEditingMessage ? 'opacity-70' : ''}`}>
        {isEditing ? (
          <div className="bg-blue-600 text-white rounded-lg p-4 max-w-3xl">
            <textarea
              ref={textareaRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full bg-transparent text-white resize-none border-none outline-none"
              rows={3}
              placeholder="Edit your message..."
            />
            <div className="flex gap-2 mt-2" data-edit-buttons>
              <button
                onClick={handleSend}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSend();
                  }
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    const cancelButton = e.currentTarget.nextElementSibling as HTMLElement;
                    cancelButton?.focus();
                  }
                }}
                className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 rounded cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
                aria-label="Send edited message"
                data-send-button
                tabIndex={0}
              >
                <FaPaperPlane size={12} />
                Send
              </button>
              <button
                onClick={handleCancel}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCancel();
                  }
                  if (e.key === 'Tab' && e.shiftKey) {
                    e.preventDefault();
                    const sendButton = e.currentTarget.previousElementSibling as HTMLElement;
                    sendButton?.focus();
                  }
                  if (e.key === 'Tab' && !e.shiftKey) {
                    e.preventDefault();
                    textareaRef.current?.focus();
                  }
                }}
                className="flex items-center gap-1 px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                aria-label="Cancel editing"
                data-cancel-button
                tabIndex={0}
              >
                <FaTimes size={12} />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div 
            className="bg-blue-600 text-white rounded-lg px-2 py-1 max-w-3xl cursor-pointer hover:bg-blue-700 transition-colors"
            onClick={handleUserMessageClick}
          >
            <MessageTextPart part={{ type: 'text', text: content }} />
          </div>
        )}
      </div>
    );
  }

  // Assistant message with tool calls and text
  const textContent = message.parts
    .filter((p) => isTextPart(p))
    .map((p) => p.text)
    .join('');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toolParts = (message.originalMessage as any)?.parts ? 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((message.originalMessage as any).parts as any[]).filter(isToolOrDynamicToolUIPart) : [];

  return (
    <div className={`${isAfterEditingMessage ? 'opacity-70' : ''}`}>
      {/* Render tool calls */}
      {toolParts.length > 0 && (
        <div className="flex flex-row gap-2">
          {toolParts.map((part, index) => {
            const toolName = getToolOrDynamicToolName(part);
            const status =
              part.state === 'output-available' ? 'success' : 'in-progress';
            const args = (part.input ?? {}) as Record<string, unknown>;
            const result =
              part.state === 'output-available' ? part.output : undefined;

            return (
              <MessageToolCallPart
                key={index}
                toolCallId={part.toolCallId}
                toolName={toolName}
                args={args}
                result={result}
                status={status}
              />
            );
          })}
        </div>
      )}

      {/* Render text content */}
      {textContent && (
        <MessageTextPart part={{ type: 'text', text: textContent }} />
      )}
    </div>
  );
}
