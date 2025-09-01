import { useCallback, useEffect } from 'react';
import { useNotebookChatStore } from '../store/notebookChatStore';
import { useAiChat } from './useAiChat';
import { useEditStore } from '../store/editStore';
import type { NotebookFile } from '../types/notebook';
import { listCells } from '../ai-functions';

interface UseNotebookChatV2Props {
  currentNotebook?: NotebookFile | null;
}

export function useNotebookChatV2({ currentNotebook }: UseNotebookChatV2Props) {
  const aiChat = useAiChat();
  const { editingMessageId, setEditingMessageId } = useEditStore();

  const {
    messages,
    isLoadingMessages,
    isSendingMessage,
    error,
    setMessages,
    removeMessagesFromIndex,
    setSendingMessage,
    setError,
    setActiveFile,
  } = useNotebookChatStore();

  // Sync with external currentNotebook prop
  useEffect(() => {
    if (currentNotebook?.id) {
      setActiveFile(currentNotebook.id);
    } else {
      setActiveFile(null);
    }
  }, [currentNotebook?.id, setActiveFile]);

  // Sync AI chat messages with our store
  useEffect(() => {
    const aiMessages = aiChat.messages.map((msg, index) => ({
      id: `msg-${index}-${((msg as unknown as Record<string, unknown>).createdAt as Date)?.getTime() || Date.now()}`,
      role: msg.role as 'user' | 'assistant',
      parts:
        (msg.parts as unknown[])
          .filter((p) => p)
          .map(
            (p) =>
              p as {
                type: 'text' | 'tool-call' | 'tool-result';
                text?: string;
              },
          ) || [],
      content:
        ((msg as unknown as Record<string, unknown>).content as string) || '',
      toolInvocations:
        ((msg as unknown as Record<string, unknown>).toolInvocations as Array<{
          toolCallId: string;
          toolName: string;
          args: Record<string, unknown>;
          result?: unknown;
          state: 'partial-call' | 'result';
        }>) || [],
    }));

    // Only update if messages actually changed
    const currentMessagesString = JSON.stringify(messages);
    const newMessagesString = JSON.stringify(aiMessages);

    if (currentMessagesString !== newMessagesString) {
      setMessages(aiMessages);
    }
  }, [aiChat.messages, messages, setMessages]);

  // Load messages from store into AI chat when they change
  useEffect(() => {
    if (messages.length === 0) {
      aiChat.setMessages([]);
    } else {
      const aiChatMessages = messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        parts: msg.parts || [],
        toolInvocations: msg.toolInvocations || [],
        content: msg.content || '',
        createdAt: new Date(),
      })) as Parameters<typeof aiChat.setMessages>[0];

      aiChat.setMessages(aiChatMessages);
    }
  }, [messages, aiChat.setMessages, aiChat]);

  const sendMessage = useCallback(
    async (messageText: string) => {
      if (!aiChat.hasApiKey) {
        setError('Please configure your Gemini API key in settings first.');
        return;
      }

      setSendingMessage(true);
      setError(null);

      try {
        await aiChat.sendMessage(messageText);

        // After sending a message, update the notebook's cells with current cell data
        if (currentNotebook) {
          try {
            const currentCells = await listCells();
            // This would be handled by the file management if we integrate cells into the store
            console.log('Current cells:', currentCells);
          } catch (error) {
            console.error('Failed to update cells:', error);
          }
        }
      } catch (error) {
        setError(
          error instanceof Error ? error.message : 'Failed to send message',
        );
      } finally {
        setSendingMessage(false);
      }
    },
    [aiChat, currentNotebook, setSendingMessage, setError],
  );

  const startEditing = useCallback(
    (messageId: string) => {
      setEditingMessageId(messageId);
    },
    [setEditingMessageId],
  );

  const cancelEditing = useCallback(() => {
    setEditingMessageId(null);
  }, [setEditingMessageId]);

  const rollbackAndEdit = useCallback(
    async (messageId: string, newText: string) => {
      const messageIndex = messages.findIndex((msg) => msg.id === messageId);
      if (messageIndex === -1) return;

      setEditingMessageId(null);

      // Remove messages from the edit point onwards
      removeMessagesFromIndex(messageIndex);

      // Send the new message
      await sendMessage(newText);
    },
    [messages, removeMessagesFromIndex, sendMessage, setEditingMessageId],
  );

  // Convert messages to the format expected by the UI
  const messagesWithIds = messages.map((msg) => ({
    id: msg.id,
    role: msg.role,
    parts: msg.parts,
    createdAt: new Date(),
    originalMessage: msg,
  }));

  return {
    messages: messagesWithIds,
    isLoading: isSendingMessage || isLoadingMessages,
    error,
    hasApiKey: aiChat.hasApiKey,
    sendMessage,
    startEditing,
    cancelEditing,
    rollbackAndEdit,
    editingMessageId,
  };
}
