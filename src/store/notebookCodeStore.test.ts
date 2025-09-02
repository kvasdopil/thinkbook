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

  describe('getCodeCell', () => {
    it('should create default cell for new notebook', () => {
      const { getCodeCell } = useNotebookCodeStore.getState();

      const cell = getCodeCell('test-notebook-1');

      expect(cell).toEqual({
        id: 'cell-test-notebook-1',
        code: 'print("Hello, World!")',
        output: [],
        error: null,
      });
    });

    it('should return existing cell for existing notebook', () => {
      const { getCodeCell, updateCode } = useNotebookCodeStore.getState();

      // Create cell and update it
      getCodeCell('test-notebook-1');
      updateCode('test-notebook-1', 'print("Modified code")');

      // Get the cell again
      const cell = getCodeCell('test-notebook-1');

      expect(cell.code).toBe('print("Modified code")');
    });
  });

  describe('updateCode', () => {
    it('should update code for existing notebook', () => {
      const { getCodeCell, updateCode } = useNotebookCodeStore.getState();

      // Create initial cell
      getCodeCell('test-notebook-1');

      // Update the code
      updateCode('test-notebook-1', 'print("Updated code")');

      // Verify the update
      const cell = getCodeCell('test-notebook-1');
      expect(cell.code).toBe('print("Updated code")');
    });

    it('should create new cell if notebook does not exist', () => {
      const { updateCode, getCodeCell } = useNotebookCodeStore.getState();

      // Update code for non-existent notebook
      updateCode('new-notebook', 'print("New code")');

      // Verify cell was created with updated code
      const cell = getCodeCell('new-notebook');
      expect(cell.code).toBe('print("New code")');
    });
  });

  describe('updateExecutionResult', () => {
    it('should update execution results for existing notebook', () => {
      const { getCodeCell, updateExecutionResult } =
        useNotebookCodeStore.getState();

      // Create initial cell
      getCodeCell('test-notebook-1');

      // Update execution results
      const output = ['Hello, World!'];
      const error = null;
      updateExecutionResult('test-notebook-1', output, error);

      // Verify the update
      const cell = getCodeCell('test-notebook-1');
      expect(cell.output).toEqual(output);
      expect(cell.error).toBe(error);
      expect(cell.lastExecuted).toBeDefined();
    });

    it('should handle execution errors', () => {
      const { getCodeCell, updateExecutionResult } =
        useNotebookCodeStore.getState();

      // Create initial cell
      getCodeCell('test-notebook-1');

      // Update with error
      const output = ['Some output'];
      const error = 'SyntaxError: invalid syntax';
      updateExecutionResult('test-notebook-1', output, error);

      // Verify the update
      const cell = getCodeCell('test-notebook-1');
      expect(cell.output).toEqual(output);
      expect(cell.error).toBe(error);
    });

    it('should not update non-existent notebook', () => {
      const { updateExecutionResult, codeCellsByNotebook } =
        useNotebookCodeStore.getState();

      // Try to update non-existent notebook
      updateExecutionResult('non-existent', ['output'], null);

      // Verify nothing was created
      expect(codeCellsByNotebook['non-existent']).toBeUndefined();
    });
  });

  describe('clearNotebook', () => {
    it('should remove notebook data', () => {
      const { getCodeCell, clearNotebook } = useNotebookCodeStore.getState();

      // Create some notebooks
      getCodeCell('notebook-1');
      getCodeCell('notebook-2');

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
      const { getCodeCell, clearAll, codeCellsByNotebook } =
        useNotebookCodeStore.getState();

      // Create some notebooks
      getCodeCell('notebook-1');
      getCodeCell('notebook-2');

      // Clear all
      clearAll();

      // Verify everything was cleared
      expect(Object.keys(codeCellsByNotebook)).toHaveLength(0);
    });
  });

  describe('multiple notebooks', () => {
    it('should handle multiple notebooks independently', () => {
      const { getCodeCell, updateCode } = useNotebookCodeStore.getState();

      // Create and update different notebooks
      getCodeCell('notebook-1');
      getCodeCell('notebook-2');

      updateCode('notebook-1', 'print("Notebook 1 code")');
      updateCode('notebook-2', 'print("Notebook 2 code")');

      // Verify they remain independent
      const cell1 = getCodeCell('notebook-1');
      const cell2 = getCodeCell('notebook-2');

      expect(cell1.code).toBe('print("Notebook 1 code")');
      expect(cell2.code).toBe('print("Notebook 2 code")');
    });
  });
});
