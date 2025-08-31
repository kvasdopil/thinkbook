import { storage } from '../utils/storage';

class GeminiApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = 'GeminiApiError';
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  message: string;
}

export class AIService {
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  async sendMessage(message: string): Promise<ChatResponse> {
    const apiKey = await storage.getGeminiApiKey();

    if (!apiKey) {
      throw new GeminiApiError(
        'Gemini API key is required. Please configure it in the settings.',
      );
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/models/gemini-pro:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: message }],
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new GeminiApiError(
          `Gemini API request failed: ${errorData.error?.message || response.statusText}`,
          response.status,
        );
      }

      const data = await response.json();

      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new GeminiApiError('Invalid response format from Gemini API');
      }

      return {
        message: data.candidates[0].content.parts[0].text,
      };
    } catch (error) {
      if (error instanceof GeminiApiError) {
        throw error;
      }
      throw new GeminiApiError(
        `Failed to communicate with Gemini API: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/models/gemini-pro:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: 'Hello' }],
              },
            ],
          }),
        },
      );

      return response.ok;
    } catch {
      return false;
    }
  }
}

export const aiService = new AIService();
