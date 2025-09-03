import { useMemo, useCallback, useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { z } from 'zod';
import { useGeminiApiKey } from './useGeminiApiKey';
import { SYSTEM_PROMPT } from '../prompts/system-prompt';
import { listCells, updateCell, createCodeCell } from '../ai-functions';
import { createClientChatTransport } from '../services/clientChatTransport';
import { storage } from '../utils/storage';

const MODEL = 'gemini-2.5-flash'; // USE THIS MODEL!

export function useAiChat() {
  const { apiKey, hasApiKey } = useGeminiApiKey();

  const tools = useMemo(
    () => ({
      listCells: {
        description: 'List all available code cells',
        inputSchema: z.object({}),
        execute: async () => {
          return await listCells();
        },
      },
      updateCell: {
        description: 'Update the content of a specific code cell',
        inputSchema: z.object({
          id: z.string().describe('The ID of the cell to update'),
          text: z.string().describe('The new content for the cell'),
        }),
        execute: async ({ id, text }: { id: string; text: string }) => {
          return await updateCell(id, text);
        },
      },
      createCodeCell: {
        description: 'Create a new code cell with the provided source code',
        inputSchema: z.object({
          text: z.string().describe('The full source code for the cell'),
        }),
        execute: async (
          { text }: { text: string },
          context: { toolCallId?: string; messages?: unknown[] },
        ) => {
          // Extract current message ID from the messages array
          const lastMessage = context.messages?.[
            context.messages.length - 1
          ] as { id?: string } | undefined;
          const currentMessageId = lastMessage?.id;

          return await createCodeCell(text, undefined, {
            messageId: currentMessageId,
            toolCallId: context.toolCallId,
          });
        },
      },
    }),
    [],
  );

  const transport = useMemo(() => {
    // Always provide a transport to avoid default /api/chat route
    console.log('[useAiChat] creating transport');
    return createClientChatTransport({
      apiKeyProvider: async () => {
        const key = await storage.getGeminiApiKey();
        console.log('[useAiChat] apiKeyProvider fetched', { present: !!key });
        return key;
      },
      model: MODEL,
      systemPrompt: SYSTEM_PROMPT,
      tools,
    });
  }, [tools]);

  const chat = useChat({
    transport,
  });

  const timeoutRef = useRef<number | null>(null);

  // Add a timeout to reset stuck loading states
  useEffect(() => {
    if (chat.status === 'submitted' || chat.status === 'streaming') {
      // Clear any existing timeout
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      // Set a timeout to force reset if stuck (10 seconds)
      timeoutRef.current = window.setTimeout(() => {
        console.log('[useAiChat] Chat status stuck, attempting to reset');
        // Force a status reset by triggering a no-op setMessages call
        const currentMessages = chat.messages;
        chat.setMessages([...currentMessages]);
        timeoutRef.current = null;
      }, 10000);
    } else {
      // Clear timeout if status changes to something else
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [chat]);

  const sendMessage = useCallback(
    async (messageText: string) => {
      console.log('[useAiChat] sendMessage', {
        hasApiKey,
        messageTextLength: messageText.length,
        status: chat.status,
      });
      if (!hasApiKey || !apiKey) {
        alert('Please configure your Gemini API key in settings first.');
        return;
      }
      await chat.sendMessage({ text: messageText });
    },
    [chat, hasApiKey, apiKey],
  );

  // Manual reset function for stuck states
  const resetChatStatus = useCallback(() => {
    console.log('[useAiChat] Manual chat status reset triggered');
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const currentMessages = chat.messages;
    chat.setMessages([...currentMessages]);
  }, [chat]);

  return {
    messages: chat.messages,
    isLoading: chat.status === 'submitted' || chat.status === 'streaming',
    error: chat.error?.message ?? null,
    hasApiKey,
    sendMessage,
    setMessages: chat.setMessages,
    resetChatStatus,
    status: chat.status, // Expose status for debugging
  };
}
