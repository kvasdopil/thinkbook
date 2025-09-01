import { useState } from 'react';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { useGeminiApiKey } from './useGeminiApiKey';
import { SYSTEM_PROMPT } from '../prompts/system-prompt';
import { listCells, updateCell } from '../ai-functions';

interface SimpleMessage {
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
  const [messages, setMessages] = useState<SimpleMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (messageText: string) => {
    if (!hasApiKey || !apiKey) {
      alert('Please configure your Gemini API key in settings first.');
      return;
    }

    setError(null);
    setIsLoading(true);

    const userMessage: SimpleMessage = {
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
      const assistantMessage: SimpleMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        toolInvocations: [],
      };

      setMessages((prev) => [...prev, assistantMessage]);

      const result = await streamText({
        model: geminiModel,
        system: SYSTEM_PROMPT,
        messages: updatedMessages.map((msg) => ({
          role: msg.role,
          content: msg.content || '',
        })),
      });

      let accumulatedText = '';

      for await (const delta of result.textStream) {
        accumulatedText += delta;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: accumulatedText,
                  toolInvocations: [],
                }
              : msg,
          ),
        );
      }

      // Simulate tool calls for testing placeholder functions
      // This demonstrates how the tool call system would work
      if (
        messageText.toLowerCase().includes('list cells') ||
        messageText.toLowerCase().includes('show cells')
      ) {
        const simulatedToolInvocations = [
          {
            toolCallId: 'test-list-cells-' + Date.now(),
            toolName: 'listCells',
            args: {},
            result: await listCells(),
            state: 'result' as const,
          },
        ];

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: accumulatedText,
                  toolInvocations: simulatedToolInvocations,
                }
              : msg,
          ),
        );
      }

      if (messageText.toLowerCase().includes('update cell')) {
        const simulatedToolInvocations = [
          {
            toolCallId: 'test-update-cell-' + Date.now(),
            toolName: 'updateCell',
            args: { id: 'cell-1', text: 'print("Updated by AI!")' },
            result: await updateCell('cell-1', 'print("Updated by AI!")'),
            state: 'result' as const,
          },
        ];

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: accumulatedText,
                  toolInvocations: simulatedToolInvocations,
                }
              : msg,
          ),
        );
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
  };

  return {
    messages,
    isLoading,
    error,
    hasApiKey,
    sendMessage,
  };
}
