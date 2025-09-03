import { z } from 'zod';

// Schema for createCodeCell function parameters
export const createCodeCellParameters = z.object({
  text: z.string().describe('The full source code for the cell'),
});

export interface CreateCodeCellResult {
  success: boolean;
  message?: string;
}

export async function createCodeCell(
  text: string,
  notebookId?: string,
  creationContext?: { messageId?: string; toolCallId?: string },
): Promise<CreateCodeCellResult> {
  console.log('Creating new code cell with text:', text);

  try {
    // Access the Zustand store directly
    const { useNotebookCodeStore } = await import('../store/notebookCodeStore');
    const store = useNotebookCodeStore.getState();

    // Use the shared context from listCells
    const { getCurrentNotebookId } = await import('./listCells');

    // Determine which notebook to use
    const targetNotebookId = notebookId || getCurrentNotebookId();

    if (!targetNotebookId) {
      return {
        success: false,
        message: 'No active notebook found',
      };
    }

    // Add the new cell with the provided code and creation context
    const cellId = store.addCell(targetNotebookId, text, creationContext);

    return {
      success: true,
      message: `Cell ${cellId} created successfully`,
    };
  } catch (error) {
    console.error('Error creating cell:', error);
    return {
      success: false,
      message: `Failed to create cell: ${error}`,
    };
  }
}
