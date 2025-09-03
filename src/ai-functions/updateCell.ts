import { z } from 'zod';

// Schema for updateCell function parameters
export const updateCellParameters = z.object({
  id: z.string().describe('The ID of the cell to update'),
  text: z.string().describe('The new text content for the cell'),
});

export interface UpdateCellResult {
  success: boolean;
  message?: string;
}

// Import the context setter (for reference)
// import { setCurrentNotebookId } from './listCells';

export async function updateCell(
  id: string,
  text: string,
  notebookId?: string,
): Promise<UpdateCellResult> {
  console.log(`Updating cell ${id} with text:`, text);

  try {
    // Access the Zustand store directly
    const { useNotebookCodeStore } = await import('../store/notebookCodeStore');
    const store = useNotebookCodeStore.getState();

    // For now, we need a way to determine which notebook the cell belongs to
    // This is a limitation of the current architecture - we should improve this
    const targetNotebookId = notebookId || getCurrentNotebookId();

    if (!targetNotebookId) {
      return {
        success: false,
        message: 'No active notebook found',
      };
    }

    // Update the cell code
    store.updateCode(targetNotebookId, id, text);

    return {
      success: true,
      message: `Cell ${id} updated successfully`,
    };
  } catch (error) {
    console.error('Error updating cell:', error);
    return {
      success: false,
      message: `Failed to update cell ${id}: ${error}`,
    };
  }
}

// Helper function to get current notebook ID
function getCurrentNotebookId(): string | null {
  // For now, this would need to be set by the UI components
  // In a more robust implementation, this could come from a router context
  return null;
}
