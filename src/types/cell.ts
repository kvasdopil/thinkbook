// Cell execution status enum
export type ExecutionStatus =
  | 'idle'
  | 'running'
  | 'complete'
  | 'failed'
  | 'cancelled'

import type { TablePayload } from './worker'

// Cell data structure for individual cells
export interface CellData {
  id: string
  type: 'code' | 'markdown'
  text: string
  output: string
  table?: TablePayload | null // Add table data to cell
  isCodeVisible: boolean
  executionStatus: ExecutionStatus
  parentId: string | null // ID of the parent message or tool call that created this cell (null if first item)
}

// Cell manager interface for managing multiple cells
export interface CellManager {
  cells: CellData[]
  isAnyRunning: boolean
  runningCellIds: Set<string>
}

// Cell operations interface
export interface CellOperations {
  updateCell: (id: string, updates: Partial<CellData>) => void
  deleteCell: (id: string) => void
  addCell: () => void
  runCell: (id: string) => void
  stopCell: (id: string) => void
  runAllCells: () => void
  toggleCellVisibility: (id: string) => void
}

// Helper function to create new cell
export function createNewCell(
  id?: string,
  parentId: string | null = null
): CellData {
  return {
    id: id || `cell-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'code',
    text: '# Write your Python code here\nprint("Hello, World!")',
    output: '',
    isCodeVisible: false,
    executionStatus: 'idle',
    parentId,
  }
}

// Helper function to get top-level comment from cell text
export function getTopLevelComment(text: string): string {
  const lines = text.split('\n')
  const commentLines = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('#')) {
      commentLines.push(trimmed.substring(1).trim())
    } else if (trimmed === '') {
      // Skip empty lines
      continue
    } else {
      // Stop at first non-comment, non-empty line
      break
    }
  }

  return commentLines.length > 0 ? commentLines.join(' ') : 'Python Code Cell'
}
