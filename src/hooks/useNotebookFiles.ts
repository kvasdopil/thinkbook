import { useEffect, useCallback, useMemo } from 'react';
import { create } from 'zustand';
import { isToday, isYesterday, format } from 'date-fns';
import type { NotebookFile, NotebookFilesStore } from '../types/notebook';
import type { CellData } from '../ai-functions';
import type { AiChatMessage } from '../types/ai-chat';
import { storage } from '../utils/storage';

// Debounced storage helper
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number,
): T => {
  let timeoutId: number;
  return ((...args: Parameters<T>) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => func(...args), delay);
  }) as T;
};

interface NotebookFilesState {
  files: Record<string, NotebookFile>;
  lastActiveFileId: string | null;
  isLoading: boolean;
}

interface NotebookFilesActions {
  setFiles: (files: Record<string, NotebookFile>) => void;
  setLastActiveFileId: (id: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  addFile: (file: NotebookFile) => void;
  updateFile: (id: string, updates: Partial<NotebookFile>) => void;
  deleteFile: (id: string) => void;
}

const useNotebookFilesStore = create<NotebookFilesState & NotebookFilesActions>(
  (set) => ({
    files: {},
    lastActiveFileId: null,
    isLoading: false,

    setFiles: (files) => set({ files }),
    setLastActiveFileId: (lastActiveFileId) => set({ lastActiveFileId }),
    setIsLoading: (isLoading) => set({ isLoading }),

    addFile: (file) =>
      set((state) => ({
        files: { ...state.files, [file.id]: file },
      })),

    updateFile: (id, updates) =>
      set((state) => ({
        files: {
          ...state.files,
          [id]: { ...state.files[id], ...updates },
        },
      })),

    deleteFile: (id) =>
      set((state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [id]: _, ...remainingFiles } = state.files;
        return {
          files: remainingFiles,
          lastActiveFileId:
            state.lastActiveFileId === id ? null : state.lastActiveFileId,
        };
      }),
  }),
);

const generateId = (): string => {
  return `notebook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const getTitleFromCells = (cells: CellData[]): string => {
  const firstCell = cells.find((cell) => cell.text.trim());
  if (!firstCell) return 'Untitled';

  // For markdown cells, extract the first line as title
  if (firstCell.type === 'markdown') {
    const firstLine = firstCell.text.split('\n')[0].trim();
    // Remove markdown header syntax
    const titleMatch = firstLine.match(/^#{1,6}\s*(.+)$/);
    if (titleMatch) return titleMatch[1].trim();
    return firstLine.slice(0, 50) + (firstLine.length > 50 ? '...' : '');
  }

  // For code cells, use the first line or show 'Code'
  return (
    firstCell.text.split('\n')[0].slice(0, 30) +
      (firstCell.text.length > 30 ? '...' : '') || 'Code'
  );
};

export const useNotebookFiles = () => {
  const store = useNotebookFilesStore();

  // Debounced save function
  const debouncedSave = useMemo(
    () =>
      debounce(async (store: NotebookFilesStore) => {
        await storage.setNotebookFiles(store);
      }, 500),
    [],
  );

  // Save to storage whenever state changes
  useEffect(() => {
    if (!store.isLoading) {
      debouncedSave({
        files: store.files,
        lastActiveFileId: store.lastActiveFileId,
      });
    }
  }, [store.files, store.lastActiveFileId, store.isLoading, debouncedSave]);

  // Load initial data
  useEffect(() => {
    const loadFiles = async () => {
      store.setIsLoading(true);
      try {
        const data = await storage.getNotebookFiles();
        store.setFiles(data.files);
        store.setLastActiveFileId(data.lastActiveFileId);
      } catch (error) {
        console.error('Failed to load notebook files:', error);
      } finally {
        store.setIsLoading(false);
      }
    };

    loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const createFile = useCallback((): NotebookFile => {
    const now = new Date().toISOString();
    const newFile: NotebookFile = {
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      title: 'Untitled',
      cells: [],
      messages: [],
    };

    store.addFile(newFile);
    store.setLastActiveFileId(newFile.id);
    return newFile;
  }, [store]);

  const updateFile = useCallback(
    (
      id: string,
      updates: {
        cells?: CellData[];
        messages?: AiChatMessage[];
        title?: string;
      },
      shouldUpdateTimestamp: boolean = true,
    ) => {
      const file = store.files[id];
      if (!file) return;

      const fileUpdates: Partial<NotebookFile> = {
        ...updates,
      };

      // Only update timestamp if explicitly requested
      if (shouldUpdateTimestamp) {
        fileUpdates.updatedAt = new Date().toISOString();
      }

      // Auto-generate title if cells are provided
      if (updates.cells && !updates.title) {
        fileUpdates.title = getTitleFromCells(updates.cells);
      }

      store.updateFile(id, fileUpdates);
    },
    [store],
  );

  const deleteFile = useCallback(
    (id: string) => {
      const fileList = Object.values(store.files).sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );

      // Find the index of the file being deleted
      const currentIndex = fileList.findIndex((file) => file.id === id);

      // Find the next file to select
      let nextFileId: string | null = null;
      if (fileList.length > 1) {
        // If there's a file after the current one, select it
        if (currentIndex < fileList.length - 1) {
          nextFileId = fileList[currentIndex + 1].id;
        }
        // Otherwise, select the previous file (if any)
        else if (currentIndex > 0) {
          nextFileId = fileList[currentIndex - 1].id;
        }
      }

      // Delete the file first
      store.deleteFile(id);

      // Update the active file if the deleted file was active
      if (store.lastActiveFileId === id) {
        store.setLastActiveFileId(nextFileId);
      }
    },
    [store],
  );

  const setActiveFile = useCallback(
    (id: string) => {
      store.setLastActiveFileId(id);
    },
    [store],
  );

  const getActiveFile = useCallback((): NotebookFile | null => {
    if (!store.lastActiveFileId) return null;
    return store.files[store.lastActiveFileId] || null;
  }, [store.files, store.lastActiveFileId]);

  // Group files by date
  const groupedFiles = useMemo(() => {
    const fileList = Object.values(store.files);
    const groups: Record<string, NotebookFile[]> = {};

    fileList.forEach((file) => {
      const date = new Date(file.updatedAt);
      let groupKey: string;

      if (isToday(date)) {
        groupKey = 'Today';
      } else if (isYesterday(date)) {
        groupKey = 'Yesterday';
      } else {
        // Format older dates as "Month DD, YYYY"
        groupKey = format(date, 'MMMM dd, yyyy');
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(file);
    });

    // Sort files within each group by updatedAt (most recent first)
    Object.values(groups).forEach((group) => {
      group.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    });

    return groups;
  }, [store.files]);

  return {
    files: store.files,
    groupedFiles,
    activeFileId: store.lastActiveFileId,
    activeFile: getActiveFile(),
    isLoading: store.isLoading,
    createFile,
    updateFile,
    deleteFile,
    setActiveFile,
  };
};
