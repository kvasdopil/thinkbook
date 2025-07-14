import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText } from 'ai'
import { SYSTEM_PROMPT } from '@/prompts/system-prompt'

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
})

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    if (!process.env.GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY is not configured' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const result = await streamText({
      model: google('gemini-2.0-flash-exp'),
      system: SYSTEM_PROMPT,
      messages,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error('Chat API error:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to process chat request',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
