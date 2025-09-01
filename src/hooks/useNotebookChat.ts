import { useEffect, useRef } from 'react';
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

  // Load messages from the current notebook when it changes
  useEffect(() => {
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
      // Update the ref to prevent unnecessary saves
      lastSavedMessagesRef.current = JSON.stringify(convertedMessages);
    } else {
      // No notebook selected, clear messages
      chat.setMessages([]);
      lastSavedMessagesRef.current = '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNotebook?.id, chat.setMessages]); // Only react to notebook ID changes

  // Save messages to the current notebook whenever they change
  useEffect(() => {
    if (currentNotebook && chat.messages.length > 0) {
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
          currentNotebook.id,
          {
            messages: messagesToStore,
          },
          false,
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.messages, currentNotebook?.id, updateFile]);

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
