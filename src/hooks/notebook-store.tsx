'use client';

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

export type CellStatus = 'idle' | 'running' | 'complete' | 'failed' | 'cancelled';

export type NotebookCell = {
  id: string;
  type: 'python' | 'markdown' | string;
  text: string;
  status: CellStatus;
  output: string[];
};

export type CellController = {
  setText: (text: string) => void;
};

type NotebookContextValue = {
  getSnapshot: () => NotebookCell[];
  registerOrUpdateCell: (cell: Partial<NotebookCell> & { id: string }) => void;
  setCellText: (id: string, text: string) => void;
  updateCellStatus: (id: string, status: CellStatus) => void;
  setCellOutput: (id: string, output: string[]) => void;
  registerController: (id: string, controller: CellController | null) => void;
};

const NotebookContext = createContext<NotebookContextValue | null>(null);

export function NotebookProvider({ children }: { children: React.ReactNode }) {
  const [cells, setCells] = useState<Record<string, NotebookCell>>({});
  const controllersRef = useRef<Record<string, CellController | null>>({});

  const registerOrUpdateCell = useCallback((cell: Partial<NotebookCell> & { id: string }) => {
    setCells((prev) => {
      const existing = prev[cell.id];
      const next: NotebookCell = {
        id: cell.id,
        type: cell.type ?? existing?.type ?? 'python',
        text: cell.text ?? existing?.text ?? '',
        status: cell.status ?? existing?.status ?? 'idle',
        output: cell.output ?? existing?.output ?? [],
      };
      return { ...prev, [cell.id]: next };
    });
  }, []);

  const setCellText = useCallback((id: string, text: string) => {
    setCells((prev) => {
      const existing = prev[id];
      if (!existing) return prev;
      return { ...prev, [id]: { ...existing, text } };
    });
    const controller = controllersRef.current[id];
    if (controller) controller.setText(text);
  }, []);

  const updateCellStatus = useCallback((id: string, status: CellStatus) => {
    setCells((prev) => {
      const existing = prev[id];
      if (!existing) return prev;
      return { ...prev, [id]: { ...existing, status } };
    });
  }, []);

  const setCellOutput = useCallback((id: string, output: string[]) => {
    setCells((prev) => {
      const existing = prev[id];
      if (!existing) return prev;
      return { ...prev, [id]: { ...existing, output } };
    });
  }, []);

  const registerController = useCallback((id: string, controller: CellController | null) => {
    controllersRef.current[id] = controller;
  }, []);

  const getSnapshot = useCallback(() => Object.values(cells), [cells]);

  const value = useMemo<NotebookContextValue>(
    () => ({
      getSnapshot,
      registerOrUpdateCell,
      setCellText,
      updateCellStatus,
      setCellOutput,
      registerController,
    }),
    [
      getSnapshot,
      registerOrUpdateCell,
      setCellText,
      updateCellStatus,
      setCellOutput,
      registerController,
    ],
  );

  return <NotebookContext.Provider value={value}>{children}</NotebookContext.Provider>;
}

export function useNotebook() {
  const ctx = useContext(NotebookContext);
  if (!ctx) throw new Error('useNotebook must be used within NotebookProvider');
  return ctx;
}
