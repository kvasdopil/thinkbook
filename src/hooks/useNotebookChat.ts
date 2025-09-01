import { useEffect, useRef, useState } from 'react';
import { useEditableChat } from './useEditableChat';
import { useNotebookFiles } from './useNotebookFiles';
import type { NotebookFile } from '../types/notebook';
import type { AiChatMessage } from '../types/ai-chat';
import { listCells } from '../ai-functions';

interface UseNotebookChatProps {
  currentNotebook?: NotebookFile | null;
}

export function useNotebookChat({ currentNotebook }: UseNotebookChatProps) {
  const chat = useEditableChat();
  const { updateFile } = useNotebookFiles();
  const lastSavedMessagesRef = useRef<string>('');
  const currentNotebookIdRef = useRef<string | null>(null);
  const [isLoadingNotebook, setIsLoadingNotebook] = useState(false);
  const transitionTimeoutRef = useRef<number | null>(null);

  // Load messages from the current notebook when it changes
  useEffect(() => {
    // Only set loading state if notebook actually changed
    const newNotebookId = currentNotebook?.id || null;
    if (currentNotebookIdRef.current !== newNotebookId) {
      setIsLoadingNotebook(true);
      currentNotebookIdRef.current = newNotebookId;

      // Clear any existing transition timeout
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }

      // Always clear messages first to prevent cross-contamination
      chat.setMessages([]);
      lastSavedMessagesRef.current = '';

      // Use a longer delay to ensure the clear operation completes
      transitionTimeoutRef.current = setTimeout(() => {
        if (currentNotebook) {
          // Convert NotebookFile messages to the format expected by the chat
          const convertedMessages = currentNotebook.messages.map((msg) => ({
            id: msg.id,
            role: msg.role,
            parts: msg.parts || [],
            toolInvocations: msg.toolInvocations || [],
            createdAt: new Date(),
            content: msg.content || '',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          })) as any[];

          chat.setMessages(convertedMessages);
          // Reset the ref for this new notebook
          lastSavedMessagesRef.current = JSON.stringify(convertedMessages);
        }

        setIsLoadingNotebook(false);
        transitionTimeoutRef.current = null;
      }, 10); // Slightly longer delay to ensure state updates
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNotebook?.id, chat.setMessages]); // Only react to notebook ID changes

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  // Save messages to the current notebook whenever they change
  useEffect(() => {
    // Don't save while we're loading a notebook to prevent race conditions
    if (isLoadingNotebook || !currentNotebook || chat.messages.length === 0) {
      return;
    }

    // Don't save during transition periods
    if (transitionTimeoutRef.current !== null) {
      return;
    }

    // Additional check: ensure we're saving to the notebook we loaded messages for
    const currentNotebookId = currentNotebook.id;
    if (currentNotebookIdRef.current !== currentNotebookId) {
      return;
    }

    // Convert chat messages back to the format for storage
    const messagesToStore: AiChatMessage[] = chat.messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parts: (msg.parts || []) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      content: (msg.originalMessage as any)?.content || '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toolInvocations: (msg.originalMessage as any)?.toolInvocations || [],
    }));

    // Only update if messages have actually changed
    const currentMessagesString = JSON.stringify(messagesToStore);
    if (currentMessagesString !== lastSavedMessagesRef.current) {
      lastSavedMessagesRef.current = currentMessagesString;

      // Update the notebook file with new messages (don't update timestamp for auto-saves)
      updateFile(
        currentNotebookId,
        {
          messages: messagesToStore,
        },
        false,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.messages, currentNotebook?.id, updateFile, isLoadingNotebook]);

  // Enhanced send message that also updates cells
  const sendMessage = async (messageText: string) => {
    await chat.sendMessage(messageText);

    // After sending a message, update the notebook's cells with current cell data
    // This should update the timestamp since it's a user-initiated action
    if (currentNotebook) {
      try {
        const currentCells = await listCells();
        updateFile(
          currentNotebook.id,
          {
            cells: currentCells,
          },
          true,
        ); // Update timestamp for user actions
      } catch (error) {
        console.error('Failed to update cells:', error);
      }
    }
  };

  return {
    ...chat,
    sendMessage,
  };
}
