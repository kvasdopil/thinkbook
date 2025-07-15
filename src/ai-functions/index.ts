// Import function metadata
import { listCellsMetadata } from './list-cells'
import { updateCellMetadata } from './update-cell'

// Export function metadata for backend
export { listCellsMetadata } from './list-cells'
export { updateCellMetadata } from './update-cell'

// Export types for frontend usage
export type { CellData } from './list-cells'
export type { UpdateCellParams, UpdateCellResult } from './update-cell'

// Collect all function metadata
export const AI_FUNCTIONS = {
  listCells: listCellsMetadata,
  updateCell: updateCellMetadata,
} as const
