import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useNotebookCodeStore } from '../store/notebookCodeStore';
import { updateCell } from './updateCell';
import { setCurrentNotebookId, getCurrentNotebookId } from './listCells';

// Mock zustand persist middleware for testing
vi.mock('zustand/middleware', () => ({
  persist: <T>(fn: T) => fn,
}));

describe('updateCell integration test', () => {
  beforeEach(() => {
    // Clear the store before each test
    const { clearAll } = useNotebookCodeStore.getState();
    clearAll();
    setCurrentNotebookId(null);
  });

  it('should update cell content in store and be reflected in getCodeCell', async () => {
    const notebookId = 'test-notebook';
    const { addCell, getCodeCell } = useNotebookCodeStore.getState();

    // Set current notebook context
    setCurrentNotebookId(notebookId);

    // Create a cell first
    const cellId = addCell(notebookId, '# Original code\nprint("original")');

    // Verify initial state
    const initialCell = getCodeCell(notebookId, cellId);
    expect(initialCell.code).toBe('# Original code\nprint("original")');

    // Update the cell using the AI function
    const result = await updateCell(cellId, '# Updated code\nprint("updated")');

    // Verify the update was successful
    expect(result.success).toBe(true);
    expect(result.message).toBe(`Cell ${cellId} updated successfully`);

    // Verify the store was updated
    const updatedCell = getCodeCell(notebookId, cellId);
    expect(updatedCell.code).toBe('# Updated code\nprint("updated")');
    expect(updatedCell.id).toBe(cellId);
  });

  it('should handle multiple cells and update the correct one', async () => {
    const notebookId = 'multi-cell-notebook';
    const { addCell, getCodeCell } = useNotebookCodeStore.getState();

    setCurrentNotebookId(notebookId);

    // Create multiple cells
    const cellId1 = addCell(notebookId, '# Cell 1\nprint("first")');
    const cellId2 = addCell(notebookId, '# Cell 2\nprint("second")');
    const cellId3 = addCell(notebookId, '# Cell 3\nprint("third")');

    // Update only the middle cell
    await updateCell(cellId2, '# Updated Cell 2\nprint("updated second")');

    // Verify only the target cell was updated
    const cell1 = getCodeCell(notebookId, cellId1);
    const cell2 = getCodeCell(notebookId, cellId2);
    const cell3 = getCodeCell(notebookId, cellId3);

    expect(cell1.code).toBe('# Cell 1\nprint("first")'); // unchanged
    expect(cell2.code).toBe('# Updated Cell 2\nprint("updated second")'); // updated
    expect(cell3.code).toBe('# Cell 3\nprint("third")'); // unchanged
  });

  it('should work across different notebooks independently', async () => {
    const { addCell, getCodeCell } = useNotebookCodeStore.getState();

    // Create cells in different notebooks
    setCurrentNotebookId('notebook-a');
    const cellA = addCell('notebook-a', '# Notebook A\nprint("a")');

    setCurrentNotebookId('notebook-b');
    const cellB = addCell('notebook-b', '# Notebook B\nprint("b")');

    // Update cell in notebook A
    setCurrentNotebookId('notebook-a');
    await updateCell(cellA, '# Updated A\nprint("updated a")');

    // Verify updates
    const updatedCellA = getCodeCell('notebook-a', cellA);
    const unchangedCellB = getCodeCell('notebook-b', cellB);

    expect(updatedCellA.code).toBe('# Updated A\nprint("updated a")');
    expect(unchangedCellB.code).toBe('# Notebook B\nprint("b")'); // unchanged
  });

  it('should maintain context correctly during updates', async () => {
    const notebookId = 'context-test';
    const { addCell } = useNotebookCodeStore.getState();

    setCurrentNotebookId(notebookId);

    const cellId = addCell(notebookId, '# Context test\nprint("test")');

    // Verify context is set correctly
    expect(getCurrentNotebookId()).toBe(notebookId);

    // Update should work with implicit notebook context
    const result = await updateCell(
      cellId,
      '# Updated context test\nprint("updated")',
    );

    expect(result.success).toBe(true);
    expect(getCurrentNotebookId()).toBe(notebookId); // context preserved
  });
});
