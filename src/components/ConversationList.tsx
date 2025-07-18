'use client'

import React, { useRef, useEffect } from 'react'
import { ConversationItem, sortConversationItems } from '@/types/conversation'
import { CellOperations } from '@/types/cell'
import ConversationItemComponent from './ConversationItem'

interface ConversationListProps {
  items: ConversationItem[];
  cellOperations: CellOperations;
  isWorkerReady: boolean;
  isStopping: boolean;
  sharedArrayBufferSupported: boolean;
  isLoading?: boolean;
  editingMessageId: string | null;
  onStartEdit: (messageId: string) => void;
  onSaveEdit: (messageId: string, newContent: string) => void;
  onCancelEdit: () => void;
}

export default function ConversationList({
  items,
  cellOperations,
  isWorkerReady,
  isStopping,
  sharedArrayBufferSupported,
  isLoading = false,
  editingMessageId,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
}: ConversationListProps) {
  const endRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new items arrive
  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [items])

  // Sort items chronologically
  const sortedItems = sortConversationItems(items);

  const editingMessageIndex = editingMessageId
    ? sortedItems.findIndex(
        (item) => item.type === 'message' && item.data.id === editingMessageId
      )
    : -1;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {sortedItems.length === 0 ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-gray-500 text-sm">
            Ask me anything about Python, data analysis, or programming
            concepts!
          </p>
        </div>
      ) : (
        sortedItems.map((item, index) => (
          <div
            key={`${item.type}-${
              item.type === 'message' ? item.data.id : item.data.id
            }-${item.timestamp}`}
            className={
              editingMessageIndex !== -1 && index > editingMessageIndex
                ? 'opacity-70'
                : ''
            }
          >
            <ConversationItemComponent
              item={item}
              cellOperations={cellOperations}
              isWorkerReady={isWorkerReady}
              isStopping={isStopping}
              sharedArrayBufferSupported={sharedArrayBufferSupported}
              editingMessageId={editingMessageId}
              onStartEdit={onStartEdit}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
            />
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

      <div ref={endRef} />
    </div>
  )
}
