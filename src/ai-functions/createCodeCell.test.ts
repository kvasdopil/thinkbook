import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCodeCell } from './createCodeCell';
import { setCurrentNotebookId, getCurrentNotebookId } from './listCells';

// Mock the store import
vi.mock('../store/notebookCodeStore', () => ({
  useNotebookCodeStore: {
    getState: () => ({
      addCell: vi.fn().mockReturnValue('test-cell-id'),
    }),
  },
}));

describe('createCodeCell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the current notebook ID
    setCurrentNotebookId(null);
  });

  describe('parameter validation', () => {
    it('should accept valid text parameter', async () => {
      setCurrentNotebookId('test-notebook');

      const result = await createCodeCell(
        '# Simple test\nprint("Hello, World!")',
      );

      expect(result).toEqual({
        success: true,
        message: 'Cell test-cell-id created successfully',
      });
    });

    it('should handle empty text', async () => {
      setCurrentNotebookId('test-notebook');

      const result = await createCodeCell('');

      expect(result).toEqual({
        success: true,
        message: 'Cell test-cell-id created successfully',
      });
    });
  });

  describe('notebook context', () => {
    it('should use current notebook ID when no notebook provided', async () => {
      const mockAddCell = vi.fn().mockReturnValue('new-cell-id');
      vi.doMock('../store/notebookCodeStore', () => ({
        useNotebookCodeStore: {
          getState: () => ({ addCell: mockAddCell }),
        },
      }));

      setCurrentNotebookId('active-notebook');

      const result = await createCodeCell('# Test cell\nprint("test")');

      expect(result.success).toBe(true);
      expect(getCurrentNotebookId()).toBe('active-notebook');
    });

    it('should use provided notebook ID when specified', async () => {
      const mockAddCell = vi.fn().mockReturnValue('explicit-cell-id');
      vi.doMock('../store/notebookCodeStore', () => ({
        useNotebookCodeStore: {
          getState: () => ({ addCell: mockAddCell }),
        },
      }));

      const result = await createCodeCell(
        '# Explicit notebook\nprint("explicit")',
        'explicit-notebook',
      );

      expect(result.success).toBe(true);
      expect(mockAddCell).toHaveBeenCalledWith(
        'explicit-notebook',
        '# Explicit notebook\nprint("explicit")',
      );
    });

    it('should fail when no notebook context available', async () => {
      // Don't set any current notebook

      const result = await createCodeCell('# No context\nprint("no context")');

      expect(result).toEqual({
        success: false,
        message: 'No active notebook found',
      });
    });
  });

  describe('cell creation', () => {
    it('should call store.addCell with correct parameters', async () => {
      const mockAddCell = vi.fn().mockReturnValue('created-cell-id');
      vi.doMock('../store/notebookCodeStore', () => ({
        useNotebookCodeStore: {
          getState: () => ({ addCell: mockAddCell }),
        },
      }));

      setCurrentNotebookId('test-notebook');
      const testCode =
        '# Data analysis\nimport pandas as pd\ndf = pd.read_csv("data.csv")';

      await createCodeCell(testCode);

      expect(mockAddCell).toHaveBeenCalledWith('test-notebook', testCode);
    });

    it('should return success with cell ID on successful creation', async () => {
      const mockAddCell = vi.fn().mockReturnValue('success-cell-id');
      vi.doMock('../store/notebookCodeStore', () => ({
        useNotebookCodeStore: {
          getState: () => ({ addCell: mockAddCell }),
        },
      }));

      setCurrentNotebookId('test-notebook');

      const result = await createCodeCell('# Success test\nprint("success")');

      expect(result).toEqual({
        success: true,
        message: 'Cell success-cell-id created successfully',
      });
    });
  });

  describe('error handling', () => {
    it('should handle store errors gracefully', async () => {
      const mockAddCell = vi.fn().mockImplementation(() => {
        throw new Error('Store operation failed');
      });
      vi.doMock('../store/notebookCodeStore', () => ({
        useNotebookCodeStore: {
          getState: () => ({ addCell: mockAddCell }),
        },
      }));

      setCurrentNotebookId('test-notebook');

      const result = await createCodeCell('# Error test\nprint("error")');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to create cell');
    });
  });

  describe('code examples with descriptions', () => {
    it('should accept any valid code content', async () => {
      setCurrentNotebookId('test-notebook');

      const codeWithDescription = `# Calculate fibonacci sequence up to n terms
def fibonacci(n):
    a, b = 0, 1
    return a + b`;

      const result = await createCodeCell(codeWithDescription);

      // The test is mainly to verify the function accepts various code patterns
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.message).toBe('string');
    });
  });
});
