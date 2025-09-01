import { useMemo, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { z } from 'zod';
import { useGeminiApiKey } from './useGeminiApiKey';
import { SYSTEM_PROMPT } from '../prompts/system-prompt';
import { listCells, updateCell } from '../ai-functions';
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

  const sendMessage = useCallback(
    async (messageText: string) => {
      console.log('[useAiChat] sendMessage', {
        hasApiKey,
        messageTextLength: messageText.length,
      });
      if (!hasApiKey || !apiKey) {
        alert('Please configure your Gemini API key in settings first.');
        return;
      }
      await chat.sendMessage({ text: messageText });
    },
    [chat, hasApiKey, apiKey],
  );

  return {
    messages: chat.messages,
    isLoading: chat.status === 'submitted' || chat.status === 'streaming',
    error: chat.error?.message ?? null,
    hasApiKey,
    sendMessage,
  };
}
