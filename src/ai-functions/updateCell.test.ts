import { describe, it, expect, beforeEach, vi } from 'vitest';
import { updateCell } from './updateCell';
import { setCurrentNotebookId, getCurrentNotebookId } from './listCells';

// Mock the store import
const mockUpdateCode = vi.fn();
vi.mock('../store/notebookCodeStore', () => ({
  useNotebookCodeStore: {
    getState: () => ({
      updateCode: mockUpdateCode,
    }),
  },
}));

describe('updateCell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateCode.mockClear();
    // Clear the current notebook ID
    setCurrentNotebookId(null);
  });

  describe('parameter validation', () => {
    it('should accept valid parameters', async () => {
      setCurrentNotebookId('test-notebook');

      const result = await updateCell(
        'cell-123',
        '# Updated code\nprint("Updated!")',
      );

      expect(result).toEqual({
        success: true,
        message: 'Cell cell-123 updated successfully',
      });
      expect(mockUpdateCode).toHaveBeenCalledWith(
        'test-notebook',
        'cell-123',
        '# Updated code\nprint("Updated!")',
      );
    });
  });

  describe('notebook context', () => {
    it('should use current notebook ID when no notebook provided', async () => {
      setCurrentNotebookId('active-notebook');

      const result = await updateCell(
        'cell-456',
        '# Test update\nprint("test")',
      );

      expect(result.success).toBe(true);
      expect(getCurrentNotebookId()).toBe('active-notebook');
      expect(mockUpdateCode).toHaveBeenCalledWith(
        'active-notebook',
        'cell-456',
        '# Test update\nprint("test")',
      );
    });

    it('should use provided notebook ID when specified', async () => {
      const result = await updateCell(
        'cell-789',
        '# Explicit notebook\nprint("explicit")',
        'explicit-notebook',
      );

      expect(result.success).toBe(true);
      expect(mockUpdateCode).toHaveBeenCalledWith(
        'explicit-notebook',
        'cell-789',
        '# Explicit notebook\nprint("explicit")',
      );
    });

    it('should fail when no notebook context available', async () => {
      // Don't set any current notebook

      const result = await updateCell(
        'cell-000',
        '# No context\nprint("no context")',
      );

      expect(result).toEqual({
        success: false,
        message: 'No active notebook found',
      });
      expect(mockUpdateCode).not.toHaveBeenCalled();
    });
  });

  describe('cell updating', () => {
    it('should call store.updateCode with correct parameters', async () => {
      setCurrentNotebookId('test-notebook');
      const testCode =
        '# Data processing\nimport pandas as pd\ndf = pd.DataFrame([1, 2, 3])';

      await updateCell('target-cell', testCode);

      expect(mockUpdateCode).toHaveBeenCalledWith(
        'test-notebook',
        'target-cell',
        testCode,
      );
    });

    it('should return success with cell ID on successful update', async () => {
      setCurrentNotebookId('test-notebook');

      const result = await updateCell(
        'success-cell',
        '# Success test\nprint("success")',
      );

      expect(result).toEqual({
        success: true,
        message: 'Cell success-cell updated successfully',
      });
    });
  });

  describe('error handling', () => {
    it('should handle store errors gracefully', async () => {
      mockUpdateCode.mockImplementation(() => {
        throw new Error('Store update failed');
      });

      setCurrentNotebookId('test-notebook');

      const result = await updateCell(
        'error-cell',
        '# Error test\nprint("error")',
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to update cell error-cell');
    });
  });
});
