import { getSnowflakeConfig } from './storage'
import {
  SnowflakeRequestBody,
  SnowflakeResult,
  SnowflakeErrorResponse,
} from '@/types/snowflake'

export async function callSnowflakeAPI(
  body: SnowflakeRequestBody
): Promise<SnowflakeResult | SnowflakeErrorResponse> {
  const { accessToken, hostname } = await getSnowflakeConfig()

  if (!accessToken || !hostname) {
    return {
      error: 'Snowflake access token and hostname are not configured.',
    }
  }

  const response = await fetch('/api/snowflake', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-snowflake-access-token': accessToken,
      'x-snowflake-hostname': hostname,
    },
    body: JSON.stringify(body),
  })

  return response.json()
}
