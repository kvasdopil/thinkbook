import { useState, useEffect, useRef } from 'react';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { useGeminiApiKey } from '../hooks/useGeminiApiKey';
import { SYSTEM_PROMPT } from '../prompts/system-prompt';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  parts: { type: 'text'; text: string }[];
}

export function AiChat() {
  const { apiKey, hasApiKey } = useGeminiApiKey();
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (messageText: string) => {
    if (!hasApiKey || !apiKey) {
      alert('Please configure your Gemini API key in settings first.');
      return;
    }

    setError(null);
    setIsLoading(true);

    const userMessage: AiChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      parts: [{ type: 'text', text: messageText }],
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    try {
      const google = createGoogleGenerativeAI({ apiKey });
      const geminiModel = google('gemini-2.0-flash-exp');

      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: AiChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        parts: [{ type: 'text', text: '' }],
      };

      setMessages((prev) => [...prev, assistantMessage]);

      const result = await streamText({
        model: geminiModel,
        system: SYSTEM_PROMPT,
        messages: updatedMessages.map((msg) => ({
          role: msg.role,
          content: msg.parts[0]?.text || '',
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
                  parts: [{ type: 'text', text: accumulatedText }],
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

  if (!hasApiKey) {
    return (
      <div className="flex flex-col h-full p-4">
        <div className="flex-1 overflow-y-auto space-y-6">
          <div className="flex justify-end">
            <div className="bg-primary-600 text-white rounded-lg p-4 max-w-3xl">
              <p>
                Please configure your Gemini API key in settings to start using
                the AI chat.
              </p>
            </div>
          </div>
        </div>

        <footer className="border-t border-gray-200 bg-white p-4">
          <div className="max-w-7xl mx-auto relative">
            <div className="text-center text-gray-500 text-sm">
              Configure your API key to start chatting
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full ">
      <div className="flex-1 overflow-y-auto space-y-6 p-4 max-w-7xl align-self-center">
        {messages.map((message, index) => (
          <ChatMessage key={index} message={message} />
        ))}

        {isLoading && (
          <div className="space-y-6 max-w-full">
            <div className="flex items-center space-x-2">
              <p>Thinking...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="space-y-6 max-w-full">
            <div className="flex items-center space-x-2">
              <p className="text-red-600">Error: {error}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <footer className="border-t border-gray-200 bg-white p-4">
        <div className="max-w-7xl mx-auto relative">
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={isLoading}
            placeholder="Ask the AI assistant..."
          />
        </div>
      </footer>
    </div>
  );
}
