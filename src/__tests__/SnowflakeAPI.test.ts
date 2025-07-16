/**
 * @jest-environment node
 */
import { POST } from '@/app/api/snowflake/route'
import { NextRequest } from 'next/server'
import {
  SnowflakeResult,
  SnowflakeRequestBody,
  SnowflakeErrorResponse,
} from '@/types/snowflake'

global.fetch = jest.fn()

const createMockRequest = (
  body: SnowflakeRequestBody,
  headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-snowflake-access-token': 'test-token',
    'x-snowflake-hostname': 'test.snowflakecomputing.com',
  }
): NextRequest => {
  return new NextRequest('http://localhost/api/snowflake', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

describe('/api/snowflake endpoint', () => {
  beforeEach(() => {
    ;(fetch as jest.Mock).mockClear()
  })

  it('should return 400 if x-snowflake-access-token is missing', async () => {
    const mockRequest = createMockRequest({ sql: 'SELECT 1' }, {
      'Content-Type': 'application/json',
      'x-snowflake-hostname': 'test.snowflakecomputing.com',
    })
    const response = await POST(mockRequest)
    const data: SnowflakeErrorResponse = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Snowflake access token and hostname are required headers.')
  })

  it('should return 400 if x-snowflake-hostname is missing', async () => {
    const mockRequest = createMockRequest({ sql: 'SELECT 1' }, {
      'Content-Type': 'application/json',
      'x-snowflake-access-token': 'test-token',
    })
    const response = await POST(mockRequest)
    const data: SnowflakeErrorResponse = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Snowflake access token and hostname are required headers.')
  })

  describe('successful SQL execution', () => {
    it('should execute SQL and return data', async () => {
      const mockRequest = createMockRequest({ sql: 'SELECT * FROM users' })
      const mockResponseData: SnowflakeResult = {
        resultSetMetaData: { numRows: 1, format: 'jsonv2', rowType: [] },
        data: [['1']],
        code: '090000',
        message: 'Statement executed successfully.',
        success: true,
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponseData,
      })

      const response = await POST(mockRequest)
      const data: SnowflakeResult = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockResponseData)
      expect(fetch).toHaveBeenCalledWith(
        'https://test.snowflakecomputing.com/api/v2/statements',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
          body: JSON.stringify({ statement: 'SELECT * FROM users', timeout: 30 }),
        })
      )
    })
  })

  describe('successful partition fetch', () => {
    it('should fetch a partition and return data', async () => {
      const mockRequest = createMockRequest({ handle: 'test-handle', partition: 1 })
      const mockResponseData: SnowflakeResult = {
        resultSetMetaData: { numRows: 1, format: 'jsonv2', rowType: [] },
        data: [['2']],
        code: '090000',
        message: 'Partition fetched successfully.',
        success: true,
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponseData,
      })

      const response = await POST(mockRequest)
      const data: SnowflakeResult = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockResponseData)
      expect(fetch).toHaveBeenCalledWith(
        'https://test.snowflakecomputing.com/api/v2/statements/test-handle?partition=1',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      )
    })
  })

  describe('error handling', () => {
    it('should return 400 when both sql and handle are missing', async () => {
      const mockRequest = createMockRequest({})
      const response = await POST(mockRequest)
      const data: SnowflakeErrorResponse = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Request must contain either "sql" or "handle".')
      expect(fetch).not.toHaveBeenCalled()
    })

    it('should handle Snowflake API errors gracefully', async () => {
      const mockRequest = createMockRequest({ sql: 'INVALID SQL' })
      const mockErrorResponse: Partial<SnowflakeResult> = {
        code: '000183',
        message: 'SQL compilation error',
        success: false,
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => mockErrorResponse,
      })

      const response = await POST(mockRequest)
      const data: SnowflakeErrorResponse = await response.json()

      expect(response.status).toBe(422)
      expect(data.error).toBe('SQL compilation error')
    })

    it('should handle internal server errors during fetch', async () => {
      const mockRequest = createMockRequest({ sql: 'SELECT 1' })
      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      const response = await POST(mockRequest)
      const data: SnowflakeErrorResponse = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
      expect(data.details).toBe('Network error')
    })
  })
})
