import {
  type ChatTransport,
  type UIMessage,
  convertToModelMessages,
  createUIMessageStream,
  stepCountIs,
  streamText,
} from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

type Tools = Record<string, unknown>;

export function createClientChatTransport(options: {
  apiKeyProvider: () => string | null | Promise<string | null>;
  model: string;
  systemPrompt: string;
  tools: Tools;
}): ChatTransport<UIMessage> {
  const { apiKeyProvider, model, systemPrompt, tools } = options;

  console.log('[ChatTransport] init', {
    model,
    tools: Object.keys(tools ?? {}),
  });

  return {
    async sendMessages({ messages, abortSignal }) {
      console.log('[ChatTransport] sendMessages(start)', {
        messagesCount: messages?.length ?? 0,
      });

      const keyOrPromise = apiKeyProvider();
      const isPromise = (
        v: unknown,
      ): v is Promise<string | null> =>
        typeof (v as { then?: unknown }).then === 'function';
      const apiKey = isPromise(keyOrPromise)
        ? await keyOrPromise
        : (keyOrPromise as string | null);

      console.log('[ChatTransport] apiKey present?', { present: !!apiKey });

      if (!apiKey) {
        // Surface a clear error without attempting any network call
        throw new Error(
          'Please configure your Gemini API key in settings first.',
        );
      }

      const google = createGoogleGenerativeAI({ apiKey });
      const lm = google(model);

      const coreMessages = convertToModelMessages(messages);

      console.log('[ChatTransport] converted messages', {
        roles: coreMessages.map((m) => m.role),
      });

      const result = await streamText({
        model: lm,
        system: systemPrompt,
        messages: coreMessages,
        tools,
        toolChoice: 'auto',
        stopWhen: stepCountIs(5),
        abortSignal,
      });

      // Prefer native conversion when available
      const toUi = (
        result as unknown as {
          toUIMessageStream?: () => ReadableStream<unknown>;
        }
      ).toUIMessageStream;

      console.log('[ChatTransport] have toUIMessageStream?', {
        has: typeof toUi === 'function',
      });

      if (typeof toUi === 'function') {
        return toUi.call(result) as unknown as ReadableStream<unknown>;
      }

      // Fallback for tests/mocks: build a UIMessageChunk stream from fullStream
      const textId = `t-${Math.random().toString(36).slice(2)}`;

      console.log('[ChatTransport] using fallback UIMessage stream');

      return createUIMessageStream({
        execute: async ({ writer }) => {
          const w = writer as unknown as { write: (p: unknown) => void };
          w.write({ type: 'start' });
          w.write({ type: 'text-start', id: textId });

          for await (const delta of (result as { fullStream: AsyncIterable<{ type: string; text?: string }> }).fullStream) {
            if (
              delta?.type === 'text-delta' &&
              typeof delta.text === 'string'
            ) {
              console.log('[ChatTransport] text-delta', {
                len: delta.text.length,
              });
              w.write({
                type: 'text-delta',
                id: textId,
                delta: delta.text,
              });
            }
          }

          w.write({ type: 'text-end', id: textId });
          w.write({ type: 'finish' });
        },
      }) as unknown as ReadableStream<unknown>;
    },

    async reconnectToStream() {
      // Not supported in client-only mode
      console.log('[ChatTransport] reconnectToStream called (not supported)');
      return null;
    },
  } as ChatTransport<UIMessage>;
}
