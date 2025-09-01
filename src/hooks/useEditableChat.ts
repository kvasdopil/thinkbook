import { useMemo, useCallback } from 'react';
import { useAiChat } from './useAiChat';
import { useEditStore } from '../store/editStore';

export interface MessageWithId {
  id: string;
  role: 'user' | 'assistant';
  parts: unknown[];
  createdAt?: Date;
  originalMessage: unknown;
}

export function useEditableChat() {
  const chat = useAiChat();
  const { editingMessageId, setEditingMessageId } = useEditStore();

  // Add stable IDs to messages
  const messagesWithIds = useMemo(() => 
    chat.messages.map((msg, index) => ({
      id: `msg-${index}-${((msg as unknown as Record<string, unknown>).createdAt as Date)?.getTime() || Date.now()}`,
      role: msg.role as 'user' | 'assistant',
      parts: msg.parts,
      createdAt: (msg as unknown as Record<string, unknown>).createdAt as Date | undefined,
      originalMessage: msg,
    } as MessageWithId))
  , [chat.messages]);

  const rollbackAndEdit = useCallback(async (messageId: string, newText: string) => {
    const messageIndex = messagesWithIds.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) return;

    // Clear editing state first
    setEditingMessageId(null);
    
    // Get all messages up to (but not including) the message being edited
    const messagesToKeep = chat.messages.slice(0, messageIndex);
    
    // Set the messages to only include those up to the edit point
    chat.setMessages(messagesToKeep);
    
    // Send the edited message, which will continue the conversation from this point
    await chat.sendMessage(newText);
  }, [messagesWithIds, chat, setEditingMessageId]);

  const startEditing = useCallback((messageId: string) => {
    setEditingMessageId(messageId);
  }, [setEditingMessageId]);

  const cancelEditing = useCallback(() => {
    setEditingMessageId(null);
  }, [setEditingMessageId]);

  return {
    ...chat,
    messages: messagesWithIds,
    editingMessageId,
    startEditing,
    cancelEditing,
    rollbackAndEdit,
  };
}