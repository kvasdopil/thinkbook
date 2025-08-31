import { useState, useEffect, useRef } from 'react';
import { google } from '@ai-sdk/google';
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
      const geminiModel = google('gemini-2.5-flash', { apiKey });

      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: AiChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        parts: [{ type: 'text', text: '' }],
      };

      setMessages(prev => [...prev, assistantMessage]);

      const result = await streamText({
        model: geminiModel,
        system: SYSTEM_PROMPT,
        messages: updatedMessages.map(msg => ({
          role: msg.role,
          content: msg.parts[0]?.text || '',
        })),
      });

      let accumulatedText = '';
      for await (const delta of result.textStream) {
        accumulatedText += delta;
        
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  parts: [{ type: 'text', text: accumulatedText }],
                }
              : msg
          )
        );
      }
    } catch (err) {
      console.error('AI Chat error:', err);
      setError(err instanceof Error ? err.message : 'Failed to get AI response');
      
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasApiKey) {
    return (
      <div className="border border-gray-200 rounded-lg bg-gray-50 p-4 mb-4">
        <div className="text-center text-gray-600">
          <p className="mb-2">AI Chat is not available</p>
          <p className="text-sm">Please configure your Gemini API key in settings to use AI chat.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white mb-4 shadow-sm">
      <div className="border-b border-gray-200 px-4 py-2 bg-gray-50 rounded-t-lg">
        <h3 className="text-sm font-medium text-gray-700">AI Assistant</h3>
      </div>
      
      <div className="h-64 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-8">
            Start a conversation with the AI assistant
          </div>
        )}
        
        {messages.map((message, index) => (
          <ChatMessage key={index} message={message} />
        ))}
        
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="max-w-[80%] rounded-lg px-4 py-2 bg-gray-100 text-gray-900">
              <div className="text-sm font-medium mb-1">Assistant</div>
              <div className="text-gray-500">Thinking...</div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="flex justify-center mb-4">
            <div className="max-w-[80%] rounded-lg px-4 py-2 bg-red-50 text-red-700 border border-red-200">
              <div className="text-sm font-medium mb-1">Error</div>
              <div className="text-sm">Failed to get response from AI. Please try again.</div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <ChatInput 
        onSendMessage={handleSendMessage}
        disabled={isLoading}
        placeholder="Ask the AI assistant..."
      />
    </div>
  );
}