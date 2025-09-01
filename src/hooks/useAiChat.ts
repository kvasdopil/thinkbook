import { useMemo, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { type UIMessage } from 'ai';
import { z } from 'zod';
import { useGeminiApiKey } from './useGeminiApiKey';
import { SYSTEM_PROMPT } from '../prompts/system-prompt';
import { listCells, updateCell } from '../ai-functions';
import { createClientChatTransport } from '../services/clientChatTransport';
import { storage } from '../utils/storage';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolInvocations?: Array<{
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
    result?: unknown;
    state: 'partial-call' | 'result';
  }>;
}

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

  const mapMessages = useCallback((uiMessages: UIMessage[]): ChatMessage[] => {
    const isTextPart = (
      part: unknown,
    ): part is { type: 'text'; text: string } => {
      return (
        typeof part === 'object' &&
        part !== null &&
        (part as { type?: unknown }).type === 'text' &&
        typeof (part as { text?: unknown }).text === 'string'
      );
    };

    type ToolLikePart = {
      type: string;
      toolCallId: string;
      state:
        | 'input-streaming'
        | 'input-available'
        | 'output-available'
        | 'output-error';
      input?: unknown;
      output?: unknown;
      toolName?: string;
    };

    const isToolPart = (part: unknown): part is ToolLikePart => {
      if (typeof part !== 'object' || part === null) return false;
      const p = part as Record<string, unknown>;
      const typeVal = typeof p.type === 'string' ? (p.type as string) : '';
      const isToolType =
        typeVal.startsWith('tool-') || typeVal === 'dynamic-tool';
      return (
        isToolType &&
        typeof p.toolCallId === 'string' &&
        typeof p.state === 'string'
      );
    };

    return uiMessages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => {
        const content = m.parts
          .filter((p) => isTextPart(p))
          .map((p) => p.text)
          .join('');

        const toolInvocations: ChatMessage['toolInvocations'] = [];

        for (const partUnknown of m.parts as unknown[]) {
          if (!isToolPart(partUnknown)) continue;
          const part = partUnknown;

          if (part.type.startsWith('tool-')) {
            const toolName = part.type.replace('tool-', '');
            const state =
              part.state === 'output-available' ? 'result' : 'partial-call';
            const args = (part.input ?? {}) as Record<string, unknown>;
            const result =
              part.state === 'output-available' ? part.output : undefined;
            toolInvocations.push({
              toolCallId: part.toolCallId,
              toolName,
              args,
              result,
              state,
            });
          } else if (part.type === 'dynamic-tool') {
            const state =
              part.state === 'output-available' ? 'result' : 'partial-call';
            const args = (part.input ?? {}) as Record<string, unknown>;
            const result =
              part.state === 'output-available' ? part.output : undefined;
            toolInvocations.push({
              toolCallId: part.toolCallId,
              toolName: part.toolName ?? 'dynamic-tool',
              args,
              result,
              state,
            });
          }
        }

        return {
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content,
          toolInvocations,
        };
      });
  }, []);

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
    messages: mapMessages(chat.messages),
    isLoading: chat.status === 'submitted' || chat.status === 'streaming',
    error: chat.error?.message ?? null,
    hasApiKey,
    sendMessage,
  };
}
