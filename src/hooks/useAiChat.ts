import { useState, useCallback } from 'react';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { useGeminiApiKey } from './useGeminiApiKey';
import { SYSTEM_PROMPT } from '../prompts/system-prompt';
import { listCells, updateCell } from '../ai-functions';
import { z } from 'zod';

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (messageText: string) => {
    if (!hasApiKey || !apiKey) {
      alert('Please configure your Gemini API key in settings first.');
      return;
    }

    setError(null);
    setIsLoading(true);

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    try {
      const google = createGoogleGenerativeAI({ apiKey: apiKey! });
      const geminiModel = google(MODEL);

      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        toolInvocations: [],
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Use streamText with tools configured properly
      const result = await streamText({
        model: geminiModel,
        system: SYSTEM_PROMPT,
        messages: updatedMessages.map((msg) => ({
          role: msg.role,
          content: msg.content || '',
        })),
        tools: {
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
        },
        toolChoice: 'auto',
      });

      let accumulatedText = '';
      const toolInvocations: ChatMessage['toolInvocations'] = [];

      // Process the stream
      for await (const delta of result.fullStream) {
        switch (delta.type) {
          case 'text-delta':
            accumulatedText += delta.text;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: accumulatedText,
                      toolInvocations,
                    }
                  : msg,
              ),
            );
            break;

          case 'tool-call':
            toolInvocations.push({
              toolCallId: delta.toolCallId,
              toolName: delta.toolName,
              args: delta.input as Record<string, unknown>,
              state: 'partial-call',
            });
            break;

          case 'tool-result': {
            const existingInvocation = toolInvocations.find(
              inv => inv.toolCallId === delta.toolCallId
            );
            if (existingInvocation) {
              existingInvocation.result = delta.output;
              existingInvocation.state = 'result';
            }
            
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: accumulatedText,
                      toolInvocations: [...toolInvocations],
                    }
                  : msg,
              ),
            );
            break;
          }
        }
      }

    } catch (err) {
      console.error('AI Chat error:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to get AI response',
      );
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  }, [messages, hasApiKey, apiKey]);

  return {
    messages,
    isLoading,
    error,
    hasApiKey,
    sendMessage,
  };
}