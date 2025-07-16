export interface SnowflakeResult {
  resultSetMetaData: {
    numRows: number
    format: string
    rowType: Array<{
      name: string
      type: string
      length?: number
      precision?: number
      scale?: number
      nullable: boolean
    }>
  }
  data?: string[][]
  code: string
  message: string
  success: boolean
  statementHandle?: string
  statementStatusUrl?: string
}

export interface SnowflakeRequestBody {
  sql?: string
  handle?: string
  partition?: number
}

export interface SnowflakeErrorResponse {
  error: string
  details?: string
}

export interface SnowflakeStatementRequest {
  statement: string
  timeout: number
}

export interface SnowflakeConfig {
  accessToken: string | null
  hostname: string | null
}
