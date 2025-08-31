import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AIService } from './aiService';
import { storage } from '../utils/storage';

vi.mock('../utils/storage');

const mockedStorage = vi.mocked(storage);

// Mock fetch
const mockFetch = vi.fn();
(globalThis as { fetch: unknown }).fetch = mockFetch;

describe('AIService', () => {
  let aiService: AIService;

  beforeEach(() => {
    vi.clearAllMocks();
    aiService = new AIService();
  });

  describe('sendMessage', () => {
    it('should throw error when Gemini API key is not configured', async () => {
      mockedStorage.getGeminiApiKey.mockResolvedValue(null);

      await expect(aiService.sendMessage('test message')).rejects.toThrow(
        'Gemini API key is required. Please configure it in the settings.',
      );
    });

    it('should send message successfully with valid API key', async () => {
      const mockApiKey = 'test-api-key';
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: 'Test response from Gemini' }],
            },
          },
        ],
      };

      mockedStorage.getGeminiApiKey.mockResolvedValue(mockApiKey);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await aiService.sendMessage('Hello');

      expect(mockFetch).toHaveBeenCalledWith(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${mockApiKey}`,
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

      expect(result).toEqual({ message: 'Test response from Gemini' });
    });

    it('should throw GeminiApiError when API returns error status', async () => {
      const mockApiKey = 'test-api-key';
      const mockErrorResponse = {
        error: { message: 'Invalid API key' },
      };

      mockedStorage.getGeminiApiKey.mockResolvedValue(mockApiKey);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve(mockErrorResponse),
      });

      await expect(aiService.sendMessage('test')).rejects.toThrow(
        'Gemini API request failed: Invalid API key',
      );
    });

    it('should throw GeminiApiError when response format is invalid', async () => {
      const mockApiKey = 'test-api-key';
      const mockInvalidResponse = { invalid: 'response' };

      mockedStorage.getGeminiApiKey.mockResolvedValue(mockApiKey);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockInvalidResponse),
      });

      await expect(aiService.sendMessage('test')).rejects.toThrow(
        'Invalid response format from Gemini API',
      );
    });

    it('should handle network errors', async () => {
      const mockApiKey = 'test-api-key';

      mockedStorage.getGeminiApiKey.mockResolvedValue(mockApiKey);
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(aiService.sendMessage('test')).rejects.toThrow(
        'Failed to communicate with Gemini API: Network error',
      );
    });
  });

  describe('validateApiKey', () => {
    it('should return true for valid API key', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const result = await aiService.validateApiKey('valid-key');

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=valid-key',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );
    });

    it('should return false for invalid API key', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      const result = await aiService.validateApiKey('invalid-key');

      expect(result).toBe(false);
    });

    it('should return false when network error occurs', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await aiService.validateApiKey('test-key');

      expect(result).toBe(false);
    });
  });
});
