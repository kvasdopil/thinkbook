import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SnowflakeService } from './snowflakeService';
import { storage } from '../utils/storage';

vi.mock('../utils/storage');

const mockedStorage = vi.mocked(storage);

// Mock fetch
const mockFetch = vi.fn();
(globalThis as { fetch: unknown }).fetch = mockFetch;

describe('SnowflakeService', () => {
  let snowflakeService: SnowflakeService;

  beforeEach(() => {
    vi.clearAllMocks();
    snowflakeService = new SnowflakeService();
  });

  describe('executeQuery', () => {
    it('should throw error when access token is not configured', async () => {
      mockedStorage.getSnowflakeAccessToken.mockResolvedValue(null);
      mockedStorage.getSnowflakeHostname.mockResolvedValue('test-hostname');

      await expect(
        snowflakeService.executeQuery({ statement: 'SELECT 1' }),
      ).rejects.toThrow(
        'Snowflake access token is required. Please configure it in the settings.',
      );
    });

    it('should throw error when hostname is not configured', async () => {
      mockedStorage.getSnowflakeAccessToken.mockResolvedValue('test-token');
      mockedStorage.getSnowflakeHostname.mockResolvedValue(null);

      await expect(
        snowflakeService.executeQuery({ statement: 'SELECT 1' }),
      ).rejects.toThrow(
        'Snowflake hostname is required. Please configure it in the settings.',
      );
    });

    it('should execute query successfully with valid config', async () => {
      const mockToken = 'test-token';
      const mockHostname = 'test-hostname.snowflakecomputing.com';
      const mockResponse = {
        statementHandle: 'test-handle-123',
        data: [['value1'], ['value2']],
        resultSetMetaData: {
          numRows: 2,
          rowType: [{ name: 'column1', type: 'VARCHAR' }],
        },
      };

      mockedStorage.getSnowflakeAccessToken.mockResolvedValue(mockToken);
      mockedStorage.getSnowflakeHostname.mockResolvedValue(mockHostname);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await snowflakeService.executeQuery({
        statement: 'SELECT * FROM table',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `https://${mockHostname}/api/v2/statements`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
            Accept: 'application/json',
          },
          body: JSON.stringify({
            statement: 'SELECT * FROM table',
            timeout: 60,
            database: undefined,
            schema: undefined,
            warehouse: undefined,
            role: undefined,
          }),
        },
      );

      expect(result).toEqual(mockResponse);
    });

    it('should include optional parameters in request', async () => {
      const mockToken = 'test-token';
      const mockHostname = 'test-hostname.snowflakecomputing.com';

      mockedStorage.getSnowflakeAccessToken.mockResolvedValue(mockToken);
      mockedStorage.getSnowflakeHostname.mockResolvedValue(mockHostname);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ statementHandle: 'test-handle' }),
      });

      const queryRequest = {
        statement: 'SELECT * FROM table',
        timeout: 120,
        database: 'TEST_DB',
        schema: 'TEST_SCHEMA',
        warehouse: 'TEST_WH',
        role: 'TEST_ROLE',
      };

      await snowflakeService.executeQuery(queryRequest);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(queryRequest),
        }),
      );
    });

    it('should throw SnowflakeError when API returns error status', async () => {
      const mockToken = 'test-token';
      const mockHostname = 'test-hostname.snowflakecomputing.com';
      const mockErrorResponse = {
        message: 'SQL compilation error',
      };

      mockedStorage.getSnowflakeAccessToken.mockResolvedValue(mockToken);
      mockedStorage.getSnowflakeHostname.mockResolvedValue(mockHostname);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve(mockErrorResponse),
      });

      await expect(
        snowflakeService.executeQuery({ statement: 'INVALID SQL' }),
      ).rejects.toThrow('Snowflake API error: SQL compilation error');
    });

    it('should handle network errors', async () => {
      mockedStorage.getSnowflakeAccessToken.mockResolvedValue('test-token');
      mockedStorage.getSnowflakeHostname.mockResolvedValue('test-hostname');
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(
        snowflakeService.executeQuery({ statement: 'SELECT 1' }),
      ).rejects.toThrow(
        'Failed to communicate with Snowflake API: Network error',
      );
    });
  });

  describe('getStatementStatus', () => {
    it('should throw error when config is missing', async () => {
      mockedStorage.getSnowflakeAccessToken.mockResolvedValue(null);
      mockedStorage.getSnowflakeHostname.mockResolvedValue(null);

      await expect(
        snowflakeService.getStatementStatus('test-handle'),
      ).rejects.toThrow('Snowflake configuration is missing');
    });

    it('should get statement status successfully', async () => {
      const mockToken = 'test-token';
      const mockHostname = 'test-hostname.snowflakecomputing.com';
      const mockResponse = {
        statementHandle: 'test-handle-123',
        message: 'Statement executed successfully',
      };

      mockedStorage.getSnowflakeAccessToken.mockResolvedValue(mockToken);
      mockedStorage.getSnowflakeHostname.mockResolvedValue(mockHostname);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result =
        await snowflakeService.getStatementStatus('test-handle-123');

      expect(mockFetch).toHaveBeenCalledWith(
        `https://${mockHostname}/api/v2/statements/test-handle-123`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${mockToken}`,
            Accept: 'application/json',
          },
        },
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('validateConfig', () => {
    it('should return true for valid config', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const result = await snowflakeService.validateConfig(
        'valid-token',
        'valid-hostname',
      );

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://valid-hostname/api/v2/statements',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-token',
          }),
        }),
      );
    });

    it('should return false for invalid config', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      const result = await snowflakeService.validateConfig(
        'invalid-token',
        'invalid-hostname',
      );

      expect(result).toBe(false);
    });

    it('should return false when network error occurs', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await snowflakeService.validateConfig(
        'test-token',
        'test-hostname',
      );

      expect(result).toBe(false);
    });
  });
});
