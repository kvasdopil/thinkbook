import { useCallback, useMemo, useEffect } from 'react';
import { isToday, isYesterday, format } from 'date-fns';
import { useNotebookChatStore } from '../store/notebookChatStore';
import type { NotebookFile } from '../types/notebook';

export const useNotebookFilesV2 = () => {
  const {
    files,
    activeFileId,
    isLoadingFiles,
    loadFiles,
    createFile,
    setActiveFile,
    updateFileMetadata,
    deleteFile,
  } = useNotebookChatStore();

  // Load files on mount
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const getActiveFile = useCallback((): NotebookFile | null => {
    if (!activeFileId) return null;
    return files[activeFileId] || null;
  }, [files, activeFileId]);

  // Group files by date
  const groupedFiles = useMemo(() => {
    const fileList = Object.values(files);
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
  }, [files]);

  return {
    files,
    groupedFiles,
    activeFileId,
    activeFile: getActiveFile(),
    isLoading: isLoadingFiles,
    createFile,
    updateFile: updateFileMetadata,
    deleteFile,
    setActiveFile,
  };
};
