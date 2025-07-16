// Import function metadata
import { listCellsMetadata } from './list-cells'
import { updateCellMetadata } from './update-cell'
import { createCodeCellMetadata } from './create-code-cell'
import { executeSqlMetadata } from './execute-sql'
import { describeSnowflakeTableMetadata } from './describe-snowflake-table'

// Export function metadata for backend
export { listCellsMetadata } from './list-cells'
export { updateCellMetadata } from './update-cell'
export { createCodeCellMetadata } from './create-code-cell'
export { executeSqlMetadata } from './execute-sql'
export { describeSnowflakeTableMetadata } from './describe-snowflake-table'

// Export types for frontend usage
export type { CellData } from './list-cells'
export type { UpdateCellParams, UpdateCellResult } from './update-cell'
export type {
  CreateCodeCellParams,
  CreateCodeCellResult,
} from './create-code-cell'

// Collect all function metadata
export const AI_FUNCTIONS = {
  listCells: listCellsMetadata,
  updateCell: updateCellMetadata,
  createCodeCell: createCodeCellMetadata,
  executeSql: executeSqlMetadata,
  describeSnowflakeTable: describeSnowflakeTableMetadata,
} as const
