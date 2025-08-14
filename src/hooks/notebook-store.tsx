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
  run: () => Promise<void>;
  stop: () => void;
  isRunning: () => boolean;
};

type NotebookContextValue = {
  // Ordered snapshot of cells
  cells: NotebookCell[];
  getSnapshot: () => NotebookCell[];
  registerOrUpdateCell: (cell: Partial<NotebookCell> & { id: string }) => void;
  setCellText: (id: string, text: string) => void;
  updateCellStatus: (id: string, status: CellStatus) => void;
  setCellOutput: (id: string, output: string[]) => void;
  registerController: (id: string, controller: CellController | null) => void;
  getController: (id: string) => CellController | null;
  deleteCell: (id: string) => void;
};

const NotebookContext = createContext<NotebookContextValue | null>(null);

export function NotebookProvider({ children }: { children: React.ReactNode }) {
  const [cellsById, setCellsById] = useState<Record<string, NotebookCell>>(() => ({
    'cell-1': {
      id: 'cell-1',
      type: 'python',
      text: "print('Hello from Python')",
      status: 'idle',
      output: [],
    },
  }));
  const [order, setOrder] = useState<string[]>(() => ['cell-1']);
  const controllersRef = useRef<Record<string, CellController | null>>({});

  const registerOrUpdateCell = useCallback((cell: Partial<NotebookCell> & { id: string }) => {
    setCellsById((prev) => {
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
    setOrder((prev) => (prev.includes(cell.id) ? prev : [...prev, cell.id]));
  }, []);

  const setCellText = useCallback((id: string, text: string) => {
    setCellsById((prev) => {
      const existing = prev[id];
      if (!existing) return prev;
      return { ...prev, [id]: { ...existing, text } };
    });
    const controller = controllersRef.current[id];
    if (controller) controller.setText(text);
  }, []);

  const updateCellStatus = useCallback((id: string, status: CellStatus) => {
    setCellsById((prev) => {
      const existing = prev[id];
      if (!existing) return prev;
      return { ...prev, [id]: { ...existing, status } };
    });
  }, []);

  const setCellOutput = useCallback((id: string, output: string[]) => {
    setCellsById((prev) => {
      const existing = prev[id];
      if (!existing) return prev;
      return { ...prev, [id]: { ...existing, output } };
    });
  }, []);

  const registerController = useCallback((id: string, controller: CellController | null) => {
    controllersRef.current[id] = controller;
  }, []);

  const getController = useCallback((id: string) => controllersRef.current[id] ?? null, []);

  const deleteCell = useCallback((id: string) => {
    setCellsById((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev } as Record<string, NotebookCell>;
      delete next[id];
      return next;
    });
    setOrder((prev) => prev.filter((x) => x !== id));
    controllersRef.current[id] = null;
  }, []);

  const cells = useMemo(() => order.map((id) => cellsById[id]).filter(Boolean), [order, cellsById]);

  const getSnapshot = useCallback(() => cells, [cells]);

  const value = useMemo<NotebookContextValue>(
    () => ({
      cells,
      getSnapshot,
      registerOrUpdateCell,
      setCellText,
      updateCellStatus,
      setCellOutput,
      registerController,
      getController,
      deleteCell,
    }),
    [
      cells,
      getSnapshot,
      registerOrUpdateCell,
      setCellText,
      updateCellStatus,
      setCellOutput,
      registerController,
      getController,
      deleteCell,
    ],
  );

  return <NotebookContext.Provider value={value}>{children}</NotebookContext.Provider>;
}

export function useNotebook() {
  const ctx = useContext(NotebookContext);
  if (!ctx) throw new Error('useNotebook must be used within NotebookProvider');
  return ctx;
}
