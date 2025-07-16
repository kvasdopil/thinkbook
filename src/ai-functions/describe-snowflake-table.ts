import { callSnowflakeAPI } from '@/utils/snowflakeClient'
import {
  SnowflakeResult,
  SnowflakeErrorResponse,
} from '@/types/snowflake'
import { z } from 'zod'

const describeTableParams = z.object({
  table: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*$/, {
    message: "Table name must be in the format 'database.schema.table'",
  }),
});

export const describeSnowflakeTableMetadata = {
  type: 'function' as const,
  function: {
    name: 'describeSnowflakeTable',
    description:
      'Describes a Snowflake table and returns the schema.',
    parameters: {
      type: 'object' as const,
      properties: {
        table: {
          type: 'string',
          description: 'The table to describe, in the format database.schema.table.',
        },
      },
      required: ['table'],
    },
  },
}

export async function describeSnowflakeTable(params: {
  table: string
}): Promise<SnowflakeResult | SnowflakeErrorResponse> {
  try {
    const { table } = describeTableParams.parse(params);
    const result = await callSnowflakeAPI({ sql: `describe table ${table}` })
    return result
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        error: error.errors.map(e => e.message).join(', '),
      };
    }
    return {
      error: 'An unknown error occurred.',
    };
  }
}
