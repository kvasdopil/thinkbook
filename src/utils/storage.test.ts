import { vi, describe, it, expect, beforeEach } from 'vitest';
import localforage from 'localforage';
import { storage } from './storage';

vi.mock('localforage');

const mockedLocalforage = vi.mocked(localforage);

describe('storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getGeminiApiKey', () => {
    it('should return the stored Gemini API key', async () => {
      const mockKey = 'test-gemini-key';
      mockedLocalforage.getItem.mockResolvedValue(mockKey);

      const result = await storage.getGeminiApiKey();

      expect(mockedLocalforage.getItem).toHaveBeenCalledWith('gemini-api-key');
      expect(result).toBe(mockKey);
    });

    it('should return null when no key is stored', async () => {
      mockedLocalforage.getItem.mockResolvedValue(null);

      const result = await storage.getGeminiApiKey();

      expect(result).toBeNull();
    });
  });

  describe('setGeminiApiKey', () => {
    it('should store the Gemini API key', async () => {
      const mockKey = 'test-gemini-key';
      mockedLocalforage.setItem.mockResolvedValue(mockKey);

      await storage.setGeminiApiKey(mockKey);

      expect(mockedLocalforage.setItem).toHaveBeenCalledWith(
        'gemini-api-key',
        mockKey,
      );
    });
  });

  describe('getSnowflakeAccessToken', () => {
    it('should return the stored Snowflake access token', async () => {
      const mockToken = 'test-snowflake-token';
      mockedLocalforage.getItem.mockResolvedValue(mockToken);

      const result = await storage.getSnowflakeAccessToken();

      expect(mockedLocalforage.getItem).toHaveBeenCalledWith(
        'snowflake-access-token',
      );
      expect(result).toBe(mockToken);
    });
  });

  describe('setSnowflakeAccessToken', () => {
    it('should store the Snowflake access token', async () => {
      const mockToken = 'test-snowflake-token';
      mockedLocalforage.setItem.mockResolvedValue(mockToken);

      await storage.setSnowflakeAccessToken(mockToken);

      expect(mockedLocalforage.setItem).toHaveBeenCalledWith(
        'snowflake-access-token',
        mockToken,
      );
    });
  });

  describe('getSnowflakeHostname', () => {
    it('should return the stored Snowflake hostname', async () => {
      const mockHostname = 'test-hostname.snowflakecomputing.com';
      mockedLocalforage.getItem.mockResolvedValue(mockHostname);

      const result = await storage.getSnowflakeHostname();

      expect(mockedLocalforage.getItem).toHaveBeenCalledWith(
        'snowflake-hostname',
      );
      expect(result).toBe(mockHostname);
    });
  });

  describe('setSnowflakeHostname', () => {
    it('should store the Snowflake hostname', async () => {
      const mockHostname = 'test-hostname.snowflakecomputing.com';
      mockedLocalforage.setItem.mockResolvedValue(mockHostname);

      await storage.setSnowflakeHostname(mockHostname);

      expect(mockedLocalforage.setItem).toHaveBeenCalledWith(
        'snowflake-hostname',
        mockHostname,
      );
    });
  });

  describe('hasAllRequiredConfig', () => {
    it('should return true when all config is present', async () => {
      mockedLocalforage.getItem
        .mockResolvedValueOnce('gemini-key')
        .mockResolvedValueOnce('snowflake-token')
        .mockResolvedValueOnce('snowflake-hostname');

      const result = await storage.hasAllRequiredConfig();

      expect(result).toBe(true);
    });

    it('should return false when Gemini key is missing', async () => {
      mockedLocalforage.getItem
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('snowflake-token')
        .mockResolvedValueOnce('snowflake-hostname');

      const result = await storage.hasAllRequiredConfig();

      expect(result).toBe(false);
    });

    it('should return false when Snowflake token is missing', async () => {
      mockedLocalforage.getItem
        .mockResolvedValueOnce('gemini-key')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('snowflake-hostname');

      const result = await storage.hasAllRequiredConfig();

      expect(result).toBe(false);
    });

    it('should return false when Snowflake hostname is missing', async () => {
      mockedLocalforage.getItem
        .mockResolvedValueOnce('gemini-key')
        .mockResolvedValueOnce('snowflake-token')
        .mockResolvedValueOnce(null);

      const result = await storage.hasAllRequiredConfig();

      expect(result).toBe(false);
    });

    it('should return false when all config is missing', async () => {
      mockedLocalforage.getItem
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const result = await storage.hasAllRequiredConfig();

      expect(result).toBe(false);
    });
  });
});
