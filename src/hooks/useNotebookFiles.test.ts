import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNotebookFiles } from './useNotebookFiles';
import { storage } from '../utils/storage';
import type { NotebookFilesStore } from '../types/notebook';

// Mock storage
vi.mock('../utils/storage', () => ({
  storage: {
    getNotebookFiles: vi.fn(),
    setNotebookFiles: vi.fn(),
  },
}));

// Mock date-fns functions
vi.mock('date-fns', async () => {
  const actual = await vi.importActual('date-fns');
  return {
    ...actual,
    isToday: vi.fn((date: Date) => {
      const today = new Date();
      return date.toDateString() === today.toDateString();
    }),
    isYesterday: vi.fn((date: Date) => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return date.toDateString() === yesterday.toDateString();
    }),
    format: vi.fn(() => {
      return 'January 01, 2023';
    }),
  };
});

const mockStorageData: NotebookFilesStore = {
  files: {
    'notebook-1': {
      id: 'notebook-1',
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
      title: 'Test Notebook 1',
      cells: [],
      messages: [],
    },
    'notebook-2': {
      id: 'notebook-2',
      createdAt: '2023-01-02T00:00:00.000Z',
      updatedAt: '2023-01-02T00:00:00.000Z',
      title: 'Test Notebook 2',
      cells: [],
      messages: [],
    },
  },
  lastActiveFileId: 'notebook-1',
};

describe('useNotebookFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storage.getNotebookFiles).mockResolvedValue(mockStorageData);
    vi.mocked(storage.setNotebookFiles).mockResolvedValue();
  });

  it('should load files from storage on mount', async () => {
    const { result } = renderHook(() => useNotebookFiles());

    expect(result.current.isLoading).toBe(true);

    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(storage.getNotebookFiles).toHaveBeenCalled();
    expect(result.current.files).toEqual(mockStorageData.files);
    expect(result.current.activeFileId).toBe('notebook-1');
  });

  it('should create a new file with correct properties', async () => {
    const { result } = renderHook(() => useNotebookFiles());

    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let newFile;
    act(() => {
      newFile = result.current.createFile();
    });

    expect(newFile).toBeDefined();
    expect(newFile!.id).toMatch(/^notebook-\d+-\w+$/);
    expect(newFile!.title).toBe('Untitled');
    expect(newFile!.cells).toEqual([]);
    expect(newFile!.messages).toEqual([]);
    expect(new Date(newFile!.createdAt)).toBeInstanceOf(Date);
    expect(new Date(newFile!.updatedAt)).toBeInstanceOf(Date);

    // Should set the new file as active
    expect(result.current.activeFileId).toBe(newFile!.id);
  });

  it('should update a file correctly', async () => {
    const { result } = renderHook(() => useNotebookFiles());

    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const testCells = [
      {
        id: 'cell-1',
        type: 'code' as const,
        text: 'print("test")',
        status: 'idle' as const,
        output: [],
      },
    ];

    act(() => {
      result.current.updateFile('notebook-1', {
        cells: testCells,
        title: 'Updated Notebook',
      });
    });

    const updatedFile = result.current.files['notebook-1'];
    expect(updatedFile.cells).toEqual(testCells);
    expect(updatedFile.title).toBe('Updated Notebook');
    expect(new Date(updatedFile.updatedAt).getTime()).toBeGreaterThan(
      new Date(mockStorageData.files['notebook-1'].updatedAt).getTime(),
    );
  });

  it('should delete a file correctly', async () => {
    const { result } = renderHook(() => useNotebookFiles());

    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.deleteFile('notebook-1');
    });

    expect(result.current.files['notebook-1']).toBeUndefined();
    // Should select the next available file (notebook-2) since notebook-1 was active
    expect(result.current.activeFileId).toBe('notebook-2');
  });

  it('should clear active file when all notebooks are deleted', async () => {
    const { result } = renderHook(() => useNotebookFiles());

    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Delete both notebooks
    act(() => {
      result.current.deleteFile('notebook-1');
    });

    act(() => {
      result.current.deleteFile('notebook-2');
    });

    expect(result.current.files['notebook-1']).toBeUndefined();
    expect(result.current.files['notebook-2']).toBeUndefined();
    // Should clear active file when no notebooks remain
    expect(result.current.activeFileId).toBeNull();
  });

  it('should set active file correctly', async () => {
    const { result } = renderHook(() => useNotebookFiles());

    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setActiveFile('notebook-2');
    });

    expect(result.current.activeFileId).toBe('notebook-2');
    expect(result.current.activeFile).toEqual(
      mockStorageData.files['notebook-2'],
    );
  });

  it('should auto-generate title from cells', async () => {
    const { result } = renderHook(() => useNotebookFiles());

    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const markdownCells = [
      {
        id: 'cell-1',
        type: 'markdown' as const,
        text: '# My Great Analysis\n\nThis is the content',
        status: 'idle' as const,
        output: [],
      },
    ];

    act(() => {
      result.current.updateFile('notebook-1', {
        cells: markdownCells,
      });
    });

    const updatedFile = result.current.files['notebook-1'];
    expect(updatedFile.title).toBe('My Great Analysis');
  });

  it('should group files by date correctly', async () => {
    // Mock date functions to return predictable results
    const { isToday, isYesterday } = await import('date-fns');

    vi.mocked(isToday).mockImplementation(
      (date: string | number | Date) =>
        new Date(date).toDateString() === new Date().toDateString(),
    );
    vi.mocked(isYesterday).mockImplementation(
      (date: string | number | Date) => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return new Date(date).toDateString() === yesterday.toDateString();
      },
    );

    const todayFile = {
      ...mockStorageData.files['notebook-1'],
      updatedAt: new Date().toISOString(),
    };

    const yesterdayFile = {
      ...mockStorageData.files['notebook-2'],
      updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    };

    vi.mocked(storage.getNotebookFiles).mockResolvedValue({
      files: {
        'notebook-1': todayFile,
        'notebook-2': yesterdayFile,
      },
      lastActiveFileId: null,
    });

    const { result } = renderHook(() => useNotebookFiles());

    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const groups = result.current.groupedFiles;
    expect(groups['Today']).toContainEqual(todayFile);
    expect(groups['Yesterday']).toContainEqual(yesterdayFile);
  });

  it('should save to storage when files change', async () => {
    const { result } = renderHook(() => useNotebookFiles());

    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.createFile();
    });

    // Wait for debounced save
    await new Promise((resolve) => setTimeout(resolve, 600));

    expect(storage.setNotebookFiles).toHaveBeenCalled();
  });
});
