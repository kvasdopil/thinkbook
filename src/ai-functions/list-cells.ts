import { z } from 'zod'
import type { CellData } from '@/types/cell'

// Schema for listCells function - no parameters needed
export const listCellsParameters = z.object({})

export const listCellsMetadata = {
  name: 'listCells',
  description:
    'Get a snapshot of all notebook cells with their ID, type, text content, and current output',
  parameters: listCellsParameters,
}

// Function implementation (used on frontend)
export async function executeListCells(): Promise<CellData[]> {
  // This function is called from the Chat component with actual cell data
  // The implementation is handled there - this is just the type definition
  return []
}

// Re-export CellData type for convenience
export type { CellData }
