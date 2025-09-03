import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useNotebookCodeStore } from './notebookCodeStore';

// Mock zustand persist middleware for testing
vi.mock('zustand/middleware', () => ({
  persist: <T>(fn: T) => fn,
}));

describe('notebookCodeStore', () => {
  beforeEach(() => {
    // Clear the store before each test
    const { clearAll } = useNotebookCodeStore.getState();
    clearAll();
  });

  describe('getCodeCells', () => {
    it('should create default cell for new notebook', () => {
      const { getCodeCells } = useNotebookCodeStore.getState();

      const cells = getCodeCells('test-notebook-1');

      expect(cells).toHaveLength(1);
      expect(cells[0]).toMatchObject({
        code: 'print("Hello, World!")',
        output: [],
        error: null,
      });
      expect(cells[0].id).toMatch(/^cell-\d+-[a-z0-9]+$/);
    });

    it('should return existing cells for existing notebook', () => {
      const { getCodeCells, updateCode } = useNotebookCodeStore.getState();

      // Create cells and update the first one
      const cells = getCodeCells('test-notebook-1');
      const firstCellId = cells[0].id;
      updateCode('test-notebook-1', firstCellId, 'print("Modified code")');

      // Get the cells again
      const updatedCells = getCodeCells('test-notebook-1');

      expect(updatedCells[0].code).toBe('print("Modified code")');
    });
  });

  describe('updateCode', () => {
    it('should update code for existing cell', () => {
      const { getCodeCells, updateCode } = useNotebookCodeStore.getState();

      // Create initial cells
      const cells = getCodeCells('test-notebook-1');
      const firstCellId = cells[0].id;

      // Update the code
      updateCode('test-notebook-1', firstCellId, 'print("Updated code")');

      // Verify the update
      const updatedCells = getCodeCells('test-notebook-1');
      expect(updatedCells[0].code).toBe('print("Updated code")');
    });
  });

  describe('updateExecutionResult', () => {
    it('should update execution results for existing cell', () => {
      const { getCodeCells, updateExecutionResult } =
        useNotebookCodeStore.getState();

      // Create initial cells
      const cells = getCodeCells('test-notebook-1');
      const firstCellId = cells[0].id;

      // Update execution results
      const output = ['Hello, World!'];
      const error = null;
      updateExecutionResult('test-notebook-1', firstCellId, output, error);

      // Verify the update
      const updatedCells = getCodeCells('test-notebook-1');
      expect(updatedCells[0].output).toEqual(output);
      expect(updatedCells[0].error).toBe(error);
      expect(updatedCells[0].lastExecuted).toBeDefined();
    });

    it('should handle execution errors', () => {
      const { getCodeCells, updateExecutionResult } =
        useNotebookCodeStore.getState();

      // Create initial cells
      const cells = getCodeCells('test-notebook-1');
      const firstCellId = cells[0].id;

      // Update with error
      const output = ['Some output'];
      const error = 'SyntaxError: invalid syntax';
      updateExecutionResult('test-notebook-1', firstCellId, output, error);

      // Verify the update
      const updatedCells = getCodeCells('test-notebook-1');
      expect(updatedCells[0].output).toEqual(output);
      expect(updatedCells[0].error).toBe(error);
    });
  });

  describe('clearNotebook', () => {
    it('should remove notebook data', () => {
      const { getCodeCells, clearNotebook } = useNotebookCodeStore.getState();

      // Create some notebooks
      getCodeCells('notebook-1');
      getCodeCells('notebook-2');

      // Clear one notebook
      clearNotebook('notebook-1');

      // Get current state after clearing
      const { codeCellsByNotebook } = useNotebookCodeStore.getState();

      // Verify it was removed
      expect(codeCellsByNotebook['notebook-1']).toBeUndefined();
      expect(codeCellsByNotebook['notebook-2']).toBeDefined();
    });
  });

  describe('clearAll', () => {
    it('should clear all notebook data', () => {
      const { getCodeCells, clearAll, codeCellsByNotebook } =
        useNotebookCodeStore.getState();

      // Create some notebooks
      getCodeCells('notebook-1');
      getCodeCells('notebook-2');

      // Clear all
      clearAll();

      // Verify everything was cleared
      expect(Object.keys(codeCellsByNotebook)).toHaveLength(0);
    });
  });

  describe('addCell', () => {
    it('should add new cell to existing notebook', () => {
      const { getCodeCells, addCell } = useNotebookCodeStore.getState();

      // Create initial cells
      getCodeCells('test-notebook');

      // Add a new cell
      const newCellId = addCell('test-notebook', 'print("New cell")');

      // Verify the cell was added
      const cells = getCodeCells('test-notebook');
      expect(cells).toHaveLength(2);

      const newCell = cells.find((cell) => cell.id === newCellId);
      expect(newCell).toBeDefined();
      expect(newCell?.code).toBe('print("New cell")');
    });
  });

  describe('deleteCell', () => {
    it('should delete cell from notebook', () => {
      const { getCodeCells, addCell, deleteCell } =
        useNotebookCodeStore.getState();

      // Create notebook with multiple cells
      const cells = getCodeCells('test-notebook');
      const firstCellId = cells[0].id;
      const secondCellId = addCell('test-notebook');

      // Delete the first cell
      deleteCell('test-notebook', firstCellId);

      // Verify it was deleted
      const remainingCells = getCodeCells('test-notebook');
      expect(remainingCells).toHaveLength(1);
      expect(remainingCells[0].id).toBe(secondCellId);
    });

    it('should maintain at least one cell when deleting last cell', () => {
      const { getCodeCells, deleteCell } = useNotebookCodeStore.getState();

      // Create notebook with one cell
      const cells = getCodeCells('test-notebook');
      const cellId = cells[0].id;

      // Delete the only cell
      deleteCell('test-notebook', cellId);

      // Verify a new cell was created
      const remainingCells = getCodeCells('test-notebook');
      expect(remainingCells).toHaveLength(1);
      expect(remainingCells[0].id).not.toBe(cellId); // New cell has different ID
    });
  });

  describe('multiple notebooks', () => {
    it('should handle multiple notebooks independently', () => {
      const { getCodeCells, updateCode } = useNotebookCodeStore.getState();

      // Create and update different notebooks
      const cells1 = getCodeCells('notebook-1');
      const cells2 = getCodeCells('notebook-2');

      updateCode('notebook-1', cells1[0].id, 'print("Notebook 1 code")');
      updateCode('notebook-2', cells2[0].id, 'print("Notebook 2 code")');

      // Verify they remain independent
      const updatedCells1 = getCodeCells('notebook-1');
      const updatedCells2 = getCodeCells('notebook-2');

      expect(updatedCells1[0].code).toBe('print("Notebook 1 code")');
      expect(updatedCells2[0].code).toBe('print("Notebook 2 code")');
    });
  });
});
