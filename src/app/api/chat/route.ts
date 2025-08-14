// API route using AI SDK streaming

import { createGoogleGenerativeAI, type GoogleGenerativeAIProvider } from '@ai-sdk/google';
import { streamText, type CoreMessage, type LanguageModelV1 } from 'ai';
import { listCellsSpec, listCellsToolName } from '@/ai-functions/list-cells';
import { updateCellSpec, updateCellToolName } from '@/ai-functions/update-cell';
import { SYSTEM_PROMPT } from '@/prompts/system-prompt';

const google: GoogleGenerativeAIProvider = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const mock = url.searchParams.get('mock') === '1';

    const body = (await req.json()) as {
      messages?: CoreMessage[];
    };

    const messages = body?.messages ?? [];

    if (mock) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          const full = {
            id: 'res1',
            type: 'message',
            message: {
              id: 'msg1',
              role: 'assistant',
              // Use parts to match UI that prefers parts-based rendering
              parts: [{ type: 'text', text: 'This is a mock response.' }],
            },
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(full)}\n\n`));
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ id: 'res1', type: 'response-end' })}\n\n`),
          );
          controller.close();
        },
      });
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    const model: LanguageModelV1 = google('gemini-2.5-flash');
    const result = await streamText({
      model,
      system: SYSTEM_PROMPT,
      messages,
      maxRetries: 1,
      maxSteps: 5,
      tools: {
        [listCellsToolName]: listCellsSpec,
        [updateCellToolName]: updateCellSpec,
      },
    });

    return result.toAIStreamResponse();
  } catch (err) {
    const message = (err as Error)?.message ?? 'Unknown error';
    console.error(err);
    return new Response(message, { status: 500 });
  }
}
