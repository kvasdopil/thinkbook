import { callSnowflakeAPI } from '@/utils/snowflakeClient'
import {
  SnowflakeResult,
  SnowflakeErrorResponse,
} from '@/types/snowflake'

export const executeSqlMetadata = {
  type: 'function' as const,
  function: {
    name: 'executeSql',
    description:
      'Executes a SQL query against Snowflake and returns the results.',
    parameters: {
      type: 'object' as const,
      properties: {
        sql: {
          type: 'string',
          description: 'The SQL query to execute.',
        },
      },
      required: ['sql'],
    },
  },
}

export async function executeSql(params: {
  sql: string
}): Promise<SnowflakeResult | SnowflakeErrorResponse> {
  const result = await callSnowflakeAPI({ sql: params.sql })
  return result
}
