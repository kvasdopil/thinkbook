import { callSnowflakeAPI } from '@/utils/snowflakeClient'
import { SnowflakeResult, SnowflakeErrorResponse } from '@/types/snowflake'

import { z } from 'zod'

const executeSqlParams = z.object({
  sql: z.string().describe('The SQL query to execute.'),
})

export const executeSqlMetadata = {
  name: 'executeSql',
  description:
    'Executes a SQL query against Snowflake and returns the results.',
  parameters: executeSqlParams,
}

export async function executeSql(params: {
  sql: string
}): Promise<SnowflakeResult | SnowflakeErrorResponse> {
  const result = await callSnowflakeAPI({ sql: params.sql })
  return result
}
