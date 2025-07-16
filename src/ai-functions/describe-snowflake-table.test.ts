import { describeSnowflakeTable } from './describe-snowflake-table'
import { callSnowflakeAPI } from '@/utils/snowflakeClient'

jest.mock('@/utils/snowflakeClient', () => ({
  callSnowflakeAPI: jest.fn(),
}))

const mockedCallSnowflakeAPI = callSnowflakeAPI as jest.Mock

describe('describeSnowflakeTable', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should call callSnowflakeAPI with the correct SQL', async () => {
    const params = { table: 'db.schema.table' }
    const expectedSql = 'describe table db.schema.table'
    const mockResult = { data: [['col1', 'varchar']] }

    mockedCallSnowflakeAPI.mockResolvedValue(mockResult)

    const result = await describeSnowflakeTable(params)

    expect(mockedCallSnowflakeAPI).toHaveBeenCalledWith({ sql: expectedSql })
    expect(result).toEqual(mockResult)
  })

  it('should return a validation error for an invalid table name', async () => {
    const params = { table: 'invalid_table_name' }
    const result = await describeSnowflakeTable(params)

    expect(result).toEqual({
      error: "Table name must be in the format 'database.schema.table'",
    })
    expect(mockedCallSnowflakeAPI).not.toHaveBeenCalled()
  })

  it('should return an error if callSnowflakeAPI throws an error', async () => {
    const params = { table: 'db.schema.table' }
    const mockError = { error: 'Snowflake API error' }

    mockedCallSnowflakeAPI.mockResolvedValue(mockError)

    const result = await describeSnowflakeTable(params)

    expect(result).toEqual(mockError)
  })

  it('should handle zod errors gracefully', async () => {
    const params = { table: 'invalid.table.name.' }; // Invalid input to trigger ZodError
    const result = await describeSnowflakeTable(params);
    expect(result).toHaveProperty('error');
    expect(result.error).toContain("Table name must be in the format 'database.schema.table'");
  });
})
