import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import type { ChatMessage } from "../../../types/worker-messages";
import { SYSTEM_PROMPT } from "../../../prompts/system-prompt";
import { getAllFunctionMetadata } from "../../ai-functions";

export async function POST(request: NextRequest) {
  try {
    // Check for API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    // Parse request body
    const { messages }: { messages: ChatMessage[] } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid messages format" },
        { status: 400 }
      );
    }

    const systemPrompt = SYSTEM_PROMPT;

    // Initialize the model
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
    const model = google("gemini-2.5-flash");

    // Get function metadata and create tools with Zod schemas
    const functionMetadata = getAllFunctionMetadata();
    const tools = Object.fromEntries(
      functionMetadata.map((fn) => [
        fn.name,
        {
          description: fn.description,
          parameters: fn.parameters, // This is now a Zod schema
        },
      ])
    );

    // Create the conversation with system prompt
    const conversationMessages = messages;

    // Stream the response
    const result = await streamText({
      model,
      system: systemPrompt,
      messages: conversationMessages,
      tools,
      onError: (error) => {
        console.error("Chat API error:", error);
      },
    });

    // Return the streaming response
    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);

    // Handle different types of errors
    if (error instanceof Error) {
      if (error.message.includes("rate limit")) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please try again later." },
          { status: 429 }
        );
      }

      if (error.message.includes("API key")) {
        return NextResponse.json(
          { error: "Invalid API key configuration" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: "An error occurred while processing your request" },
      { status: 500 }
    );
  }
}
