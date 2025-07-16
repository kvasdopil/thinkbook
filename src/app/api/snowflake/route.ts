import { NextRequest } from 'next/server'
import {
  SnowflakeResult,
  SnowflakeRequestBody,
  SnowflakeErrorResponse,
  SnowflakeStatementRequest,
} from '@/types/snowflake'

export async function POST(req: NextRequest) {
  try {
    const accessToken = req.headers.get('x-snowflake-access-token')
    const hostname = req.headers.get('x-snowflake-hostname')

    if (!accessToken || !hostname) {
      return new Response(
        JSON.stringify({
          error:
            'Snowflake access token and hostname are required headers.',
        } as SnowflakeErrorResponse),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const body: SnowflakeRequestBody = await req.json()
    const { sql, handle, partition } = body

    if (!sql && !handle) {
      return new Response(
        JSON.stringify({
          error: 'Request must contain either "sql" or "handle".',
        } as SnowflakeErrorResponse),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const baseUrl = `https://${hostname}`
    let snowflakeUrl: string
    let requestBody: SnowflakeStatementRequest | undefined

    if (sql) {
      snowflakeUrl = `${baseUrl}/api/v2/statements`
      requestBody = {
        statement: sql,
        timeout: 30,
      }
    } else {
      const partitionNumber = Number(partition) || 0
      snowflakeUrl = `${baseUrl}/api/v2/statements/${handle}?partition=${partitionNumber}`
      requestBody = undefined
    }

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
      console.error('Snowflake API error:', responseData.message || 'Unknown error')
      return new Response(
        JSON.stringify({
          error: responseData.message || 'Snowflake API request failed',
        } as SnowflakeErrorResponse),
        {
          status: snowflakeResponse.status,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

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
