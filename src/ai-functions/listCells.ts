import { z } from 'zod';

// Schema for listCells function - requires notebookId
export const listCellsParameters = z.object({
  notebookId: z.string().describe('The ID of the notebook to list cells from'),
});

export interface CellData {
  id: string;
  type: 'code' | 'markdown';
  text: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  output: string[];
}

// Global variable to store current notebook context for AI functions
let currentNotebookId: string | null = null;

export function setCurrentNotebookId(notebookId: string | null) {
  currentNotebookId = notebookId;
}

export function getCurrentNotebookId(): string | null {
  return currentNotebookId;
}

export async function listCells(notebookId?: string): Promise<CellData[]> {
  // Use provided notebookId or the global one
  const targetNotebookId = notebookId || currentNotebookId;

  if (!targetNotebookId) {
    return [];
  }

  // Access the Zustand store directly
  const { useNotebookCodeStore } = await import('../store/notebookCodeStore');
  const store = useNotebookCodeStore.getState();

  try {
    const cells = store.getCodeCells(targetNotebookId);

    return cells.map((cell) => ({
      id: cell.id,
      type: 'code' as const, // All cells are code for now
      text: cell.code,
      status: cell.error
        ? 'error'
        : cell.output.length > 0
          ? 'completed'
          : 'idle',
      output: cell.output,
    }));
  } catch (error) {
    console.error('Error listing cells:', error);
    return [];
  }
}
