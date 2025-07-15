/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/snowflake/route'

// Mock fetch globally
global.fetch = jest.fn()

// Mock environment variables
const originalEnv = process.env

beforeEach(() => {
  process.env = { ...originalEnv }
  process.env.SNOWFLAKE_BASE_URL = 'https://test.snowflakecomputing.com'
  ;(fetch as jest.Mock).mockClear()
})

afterEach(() => {
  process.env = originalEnv
})

// Helper function to create mock requests
function createMockRequest(
  body: Record<string, unknown>,
  headers: Record<string, string> = {}
): NextRequest {
  return new NextRequest('http://localhost:3000/api/snowflake', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

// Mock successful Snowflake response
const mockSuccessfulResponse = {
  resultSetMetaData: {
    numRows: 2,
    format: 'json',
    rowType: [
      {
        name: 'ID',
        type: 'NUMBER',
        nullable: false,
      },
      {
        name: 'NAME',
        type: 'VARCHAR',
        nullable: true,
      },
    ],
  },
  data: [
    ['1', 'John'],
    ['2', 'Jane'],
  ],
  code: '090001',
  message: 'successfully executed',
  success: true,
  statementHandle: 'statement-handle-123',
}

describe('/api/snowflake', () => {
  describe('successful SQL execution', () => {
    it('should execute SQL query and return Snowflake response', async () => {
      const mockRequest = createMockRequest(
        { sql: 'SELECT * FROM users' },
        { 'x-snowflake-access-token': 'valid-token' }
      )

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessfulResponse,
      })

      const response = await POST(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(200)
      expect(responseBody).toEqual(mockSuccessfulResponse)
      expect(fetch).toHaveBeenCalledWith(
        'https://test.snowflakecomputing.com/api/v2/statements',
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer valid-token',
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            statement: 'SELECT * FROM users',
            timeout: 30,
          }),
        }
      )
    })
  })

  describe('successful partition fetch', () => {
    it('should fetch partition with default partition 0', async () => {
      const mockRequest = createMockRequest(
        { handle: 'statement-handle-123' },
        { 'x-snowflake-access-token': 'valid-token' }
      )

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessfulResponse,
      })

      const response = await POST(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(200)
      expect(responseBody).toEqual(mockSuccessfulResponse)
      expect(fetch).toHaveBeenCalledWith(
        'https://test.snowflakecomputing.com/api/v2/statements/statement-handle-123?partition=0',
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer valid-token',
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: undefined,
        }
      )
    })

    it('should fetch specific partition when provided', async () => {
      const mockRequest = createMockRequest(
        { handle: 'statement-handle-123', partition: 5 },
        { 'x-snowflake-access-token': 'valid-token' }
      )

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessfulResponse,
      })

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
      expect(fetch).toHaveBeenCalledWith(
        'https://test.snowflakecomputing.com/api/v2/statements/statement-handle-123?partition=5',
        expect.objectContaining({
          method: 'GET',
        })
      )
    })

    it('should handle partition as string and convert to number', async () => {
      const mockRequest = createMockRequest(
        { handle: 'statement-handle-123', partition: '3' },
        { 'x-snowflake-access-token': 'valid-token' }
      )

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessfulResponse,
      })

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
      expect(fetch).toHaveBeenCalledWith(
        'https://test.snowflakecomputing.com/api/v2/statements/statement-handle-123?partition=3',
        expect.objectContaining({
          method: 'GET',
        })
      )
    })
  })

  describe('missing access token', () => {
    it('should return 400 when x-snowflake-access-token header is missing', async () => {
      const mockRequest = createMockRequest({ sql: 'SELECT * FROM users' })

      const response = await POST(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(400)
      expect(responseBody).toEqual({
        error: 'A valid Snowflake access token is required',
      })
      expect(fetch).not.toHaveBeenCalled()
    })
  })

  describe('missing parameters', () => {
    it('should return 400 when both sql and handle are missing', async () => {
      const mockRequest = createMockRequest(
        {},
        { 'x-snowflake-access-token': 'valid-token' }
      )

      const response = await POST(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(400)
      expect(responseBody).toEqual({
        error: 'Request must contain either "sql" or "handle"',
      })
      expect(fetch).not.toHaveBeenCalled()
    })
  })

  describe('Snowflake API error propagation', () => {
    it('should return 500 when Snowflake API returns error', async () => {
      const mockRequest = createMockRequest(
        { sql: 'INVALID SQL' },
        { 'x-snowflake-access-token': 'valid-token' }
      )

      const snowflakeError = {
        code: '100001',
        message: 'SQL compilation error: syntax error',
        success: false,
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => snowflakeError,
      })

      const response = await POST(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(500)
      expect(responseBody).toEqual({
        error: 'SQL compilation error: syntax error',
      })
    })

    it('should handle Snowflake API error without message', async () => {
      const mockRequest = createMockRequest(
        { sql: 'INVALID SQL' },
        { 'x-snowflake-access-token': 'valid-token' }
      )

      const snowflakeError = {
        code: '100001',
        success: false,
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => snowflakeError,
      })

      const response = await POST(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(500)
      expect(responseBody).toEqual({
        error: 'Snowflake API request failed',
      })
    })
  })

  describe('environment variable missing', () => {
    it('should throw error when SNOWFLAKE_BASE_URL is not configured', async () => {
      delete process.env.SNOWFLAKE_BASE_URL

      const mockRequest = createMockRequest(
        { sql: 'SELECT * FROM users' },
        { 'x-snowflake-access-token': 'valid-token' }
      )

      const response = await POST(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(500)
      expect(responseBody.error).toBe('Internal server error')
      expect(responseBody.details).toBe(
        'SNOWFLAKE_BASE_URL environment variable is not configured'
      )
    })
  })

  describe('network errors', () => {
    it('should handle fetch errors gracefully', async () => {
      const mockRequest = createMockRequest(
        { sql: 'SELECT * FROM users' },
        { 'x-snowflake-access-token': 'valid-token' }
      )

      ;(fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network connection failed')
      )

      const response = await POST(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(500)
      expect(responseBody.error).toBe('Internal server error')
      expect(responseBody.details).toBe('Network connection failed')
    })
  })

  describe('JSON parsing errors', () => {
    it('should handle invalid request body', async () => {
      const mockRequest = new NextRequest(
        'http://localhost:3000/api/snowflake',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-snowflake-access-token': 'valid-token',
          },
          body: 'invalid json',
        }
      )

      const response = await POST(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(500)
      expect(responseBody.error).toBe('Internal server error')
      expect(responseBody.details).toBeTruthy()
    })
  })
})
