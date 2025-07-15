import { NextRequest } from 'next/server'
import {
  SnowflakeResult,
  SnowflakeRequestBody,
  SnowflakeErrorResponse,
  SnowflakeStatementRequest,
} from '@/types/snowflake'

export async function POST(req: NextRequest) {
  try {
    // Check for required environment variable
    const baseUrl = process.env.SNOWFLAKE_BASE_URL
    if (!baseUrl) {
      throw new Error(
        'SNOWFLAKE_BASE_URL environment variable is not configured'
      )
    }

    // Get access token from headers
    const accessToken = req.headers.get('x-snowflake-access-token')
    if (!accessToken) {
      return new Response(
        JSON.stringify({
          error: 'A valid Snowflake access token is required',
        } as SnowflakeErrorResponse),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Parse request body
    const body: SnowflakeRequestBody = await req.json()
    const { sql, handle, partition } = body

    // Validate that either sql or handle is provided
    if (!sql && !handle) {
      return new Response(
        JSON.stringify({
          error: 'Request must contain either "sql" or "handle"',
        } as SnowflakeErrorResponse),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    let snowflakeUrl: string
    let requestBody: SnowflakeStatementRequest | undefined

    if (sql) {
      // Execute SQL query
      snowflakeUrl = `${baseUrl}/api/v2/statements`
      requestBody = {
        statement: sql,
        timeout: 30,
      }
    } else {
      // Fetch partition of existing statement
      const partitionNumber = Number(partition) || 0
      snowflakeUrl = `${baseUrl}/api/v2/statements/${handle}?partition=${partitionNumber}`
      requestBody = undefined
    }

    // Make request to Snowflake API
    const snowflakeResponse = await fetch(snowflakeUrl, {
      method: sql ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: requestBody ? JSON.stringify(requestBody) : undefined,
    })

    const responseData: SnowflakeResult = await snowflakeResponse.json()

    if (!snowflakeResponse.ok) {
      console.error(
        'Snowflake API error:',
        responseData.message || 'Unknown error'
      )
      return new Response(
        JSON.stringify({
          error: responseData.message || 'Snowflake API request failed',
        } as SnowflakeErrorResponse),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Return successful response
    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Snowflake endpoint error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      } as SnowflakeErrorResponse),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
