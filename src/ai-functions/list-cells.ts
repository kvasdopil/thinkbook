import { z } from 'zod'

// Schema for listCells function - no parameters needed
export const listCellsParameters = z.object({})

export interface CellData {
  id: string
  type: 'code' | 'markdown'
  text: string
  output: string
}

export const listCellsMetadata = {
  name: 'listCells',
  description:
    'Get a snapshot of all notebook cells with their ID, type, text content, and current output',
  parameters: listCellsParameters,
}

// Function implementation (used on frontend)
export async function executeListCells(): Promise<CellData[]> {
  // For now, we'll work with the current single cell structure
  // This will be adapted when multiple cells are implemented

  // Access the current cell data from the page state
  // This is a placeholder - actual implementation will need to access the current state
  return [
    {
      id: 'cell-1',
      type: 'code',
      text: '# Single cell content will be populated by the frontend',
      output: 'Cell output will be populated by the frontend',
    },
  ]
}
