import { useEffect, useCallback } from 'react';
import { useEditableChat } from './useEditableChat';
import { useNotebookFiles } from './useNotebookFiles';
import { useNotebookChatStoreSimple } from '../store/notebookChatStoreSimple';
import type { NotebookFile } from '../types/notebook';
import type {
  AiChatMessage,
  ToolInvocation,
  MessagePart,
} from '../types/ai-chat';
import { listCells } from '../ai-functions';

interface UseNotebookChatSimpleProps {
  currentNotebook?: NotebookFile | null;
}

/**
 * A refactored version of useNotebookChat that uses Zustand store to eliminate race conditions.
 *
 * Key improvements:
 * 1. File switching is handled at the store level
 * 2. No complex effect synchronization
 * 3. Messages are properly isolated per file
 */
export function useNotebookChatSimple({
  currentNotebook,
}: UseNotebookChatSimpleProps) {
  const chat = useEditableChat();
  const { updateFile } = useNotebookFiles();

  const { switchToFile, updateMessages, isLoadingMessages } =
    useNotebookChatStoreSimple();

  // Handle file switching - this is the critical part that eliminates race conditions
  useEffect(() => {
    if (currentNotebook) {
      // Switch to the new file, providing its existing messages
      switchToFile(currentNotebook.id, currentNotebook.messages);

      // Load the messages into the chat UI
      const messagesForUI = currentNotebook.messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        parts: msg.parts || [],
        toolInvocations: msg.toolInvocations || [],
        createdAt: new Date(),
        content: msg.content || '',
      })) as Parameters<typeof chat.setMessages>[0];

      chat.setMessages(messagesForUI);
    } else {
      // No notebook selected
      switchToFile(null);
      chat.setMessages([]);
    }
  }, [
    currentNotebook?.id,
    switchToFile,
    chat.setMessages,
    chat,
    currentNotebook,
  ]);

  // Save messages when chat changes - but only if we're not switching files
  useEffect(() => {
    if (!currentNotebook || isLoadingMessages) return;

    // Convert chat messages to storage format
    const messagesToStore: AiChatMessage[] = chat.messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      parts: (msg.parts || []).map((p) => p as MessagePart),
      content:
        ((msg.originalMessage as Record<string, unknown>)?.content as string) ||
        '',
      toolInvocations:
        ((msg.originalMessage as Record<string, unknown>)
          ?.toolInvocations as ToolInvocation[]) || [],
    }));

    // Update the store - this prevents race conditions
    updateMessages(messagesToStore);

    // Save to persistent storage
    updateFile(
      currentNotebook.id,
      { messages: messagesToStore },
      false, // Don't update timestamp for auto-saves
    );
  }, [
    chat.messages,
    currentNotebook?.id,
    updateMessages,
    updateFile,
    isLoadingMessages,
    currentNotebook,
  ]);

  // Enhanced send message that also updates cells
  const sendMessage = useCallback(
    async (messageText: string) => {
      await chat.sendMessage(messageText);

      // After sending a message, update the notebook's cells with current cell data
      if (currentNotebook) {
        try {
          const currentCells = await listCells();
          updateFile(
            currentNotebook.id,
            { cells: currentCells },
            true, // Update timestamp for user actions
          );
        } catch (error) {
          console.error('Failed to update cells:', error);
        }
      }
    },
    [chat, currentNotebook, updateFile],
  );

  return {
    ...chat,
    sendMessage,
  };
}
