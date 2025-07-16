import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText } from 'ai'
import { SYSTEM_PROMPT } from '@/prompts/system-prompt'
import { AI_FUNCTIONS } from '@/ai-functions'

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()
    const geminiApiKey = req.headers.get('x-gemini-api-key')

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing x-gemini-api-key header' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const google = createGoogleGenerativeAI({
      apiKey: geminiApiKey,
    })

    const result = await streamText({
      model: google('gemini-2.0-flash-exp'),
      system: SYSTEM_PROMPT,
      messages,
      tools: {
        listCells: {
          description: AI_FUNCTIONS.listCells.description,
          parameters: AI_FUNCTIONS.listCells.parameters,
        },
        updateCell: {
          description: AI_FUNCTIONS.updateCell.description,
          parameters: AI_FUNCTIONS.updateCell.parameters,
        },
        createCodeCell: {
          description: AI_FUNCTIONS.createCodeCell.description,
          parameters: AI_FUNCTIONS.createCodeCell.parameters,
        },
      },
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
