import { useEffect, useRef } from 'react';
import { useNotebookChat } from '../hooks/useNotebookChat';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { NotebookCell } from './NotebookCell';
import type { NotebookFile } from '../types/notebook';

interface AiChatProps {
  currentNotebook?: NotebookFile | null;
}

export function AiChat({ currentNotebook }: AiChatProps) {
  const {
    messages,
    isLoading,
    error,
    hasApiKey,
    sendMessage,
    startEditing,
    cancelEditing,
    rollbackAndEdit,
    editingMessageId,
    resetChatStatus,
  } = useNotebookChat({ currentNotebook });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Find the index of the message being edited
  const editingMessageIndex = editingMessageId
    ? messages.findIndex((msg) => msg.id === editingMessageId)
    : -1;

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!hasApiKey) {
    return (
      <div className="flex flex-col h-full p-4 flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-6 max-w-7xl mx-auto">
          {/* Jupyter Notebook Cell */}
          <div className="w-full">
            <NotebookCell notebookId={currentNotebook?.id} />
          </div>

          <div className="flex justify-end">
            <div className="bg-primary-600 text-white rounded-lg p-4 max-w-3xl">
              <p>
                Please configure your Gemini API key in settings to start using
                the AI chat.
              </p>
            </div>
          </div>
        </div>

        <footer className="border-t border-gray-200 bg-white p-4">
          <div className="max-w-7xl mx-auto relative">
            <div className="text-center text-gray-500 text-sm">
              Configure your API key to start chatting
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full items-center flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto space-y-6 p-4 max-w-7xl">
        {/* Jupyter Notebook Cell */}
        <div className="w-full">
          <NotebookCell notebookId={currentNotebook?.id} />
        </div>

        {messages.map((message, index) => (
          <ChatMessage
            key={message.id}
            message={message}
            messageIndex={index}
            editingMessageIndex={editingMessageIndex}
            onStartEdit={startEditing}
            onCancelEdit={cancelEditing}
            onSendEdit={rollbackAndEdit}
          />
        ))}

        {isLoading && (
          <div className="space-y-6 max-w-full">
            <div className="flex items-center space-x-2">
              <p>Thinking...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="space-y-6 max-w-full">
            <div className="flex items-center space-x-2">
              <p className="text-red-600">Error: {error}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <footer className="border-t border-gray-200 bg-white p-4 w-full flex items-center justify-center">
        <div className="max-w-7xl relative flex-1">
          <ChatInput
            onSendMessage={sendMessage}
            disabled={isLoading}
            placeholder="Ask the AI assistant..."
            onResetChat={resetChatStatus}
          />
        </div>
      </footer>
    </div>
  );
}
