import React, { useState, useRef, useEffect } from 'react';
import { FaPaperPlane, FaTimes } from 'react-icons/fa';
import { Message } from 'ai/react';
import ReactMarkdown from 'react-markdown';
import MarkdownComponents from './MarkdownComponents';
import ToolCallDisplay from './ToolCallDisplay';

interface MessageItemProps {
  message: Message;
  isEditing: boolean;
  onStartEdit: (messageId: string) => void;
  onSave: (newContent: string) => void;
  onCancel: () => void;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
}) => {
  const [editedContent, setEditedContent] = useState(message.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing) {
      textareaRef.current?.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    onSave(editedContent);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  if (message.role === 'user') {
    if (isEditing) {
      return (
        <div className="flex flex-col">
          <textarea
            ref={textareaRef}
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={onCancel}
            className="p-2 border rounded w-full"
          />
          <div className="flex justify-end mt-2" onMouseDown={(e) => e.preventDefault()}>
            <button
              onClick={handleSave}
              className="mr-2 p-2 hover:bg-gray-200 cursor-pointer"
              aria-label="Send"
            >
              <FaPaperPlane />
            </button>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-200 cursor-pointer"
              aria-label="Cancel"
            >
              <FaTimes />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        onClick={() => onStartEdit(message.id)}
        className="p-2 cursor-pointer hover:bg-gray-100"
      >
        {message.content}
      </div>
    );
  }

  // Assistant message
  return (
    <div className="bg-gray-100 p-2 rounded">
      <ReactMarkdown components={MarkdownComponents}>
        {message.content}
      </ReactMarkdown>
      {message.toolInvocations?.map((toolInvocation, index) => (
        <ToolCallDisplay key={index} toolInvocation={toolInvocation} />
      ))}
    </div>
  );
};

export default MessageItem;
