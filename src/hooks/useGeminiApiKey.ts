import { useState, useEffect } from 'react';
import { storage } from '../utils/storage';

export function useGeminiApiKey() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const key = await storage.getGeminiApiKey();
        setApiKey(key);
      } catch (error) {
        console.error('Failed to load Gemini API key:', error);
        setApiKey(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadApiKey();
  }, []);

  const updateApiKey = async (newKey: string) => {
    try {
      await storage.setGeminiApiKey(newKey);
      setApiKey(newKey);
    } catch (error) {
      console.error('Failed to save Gemini API key:', error);
      throw error;
    }
  };

  return {
    apiKey,
    isLoading,
    updateApiKey,
    hasApiKey: !!apiKey,
  };
}
