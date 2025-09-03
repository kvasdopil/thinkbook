import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CodeCell {
  id: string;
  code: string;
  output: string[];
  error: string | null;
  lastExecuted?: string; // ISO timestamp
  createdByMessageId?: string; // ID of the message that created this cell
  createdByToolCallId?: string; // ID of the tool call that created this cell
  createdAt?: string; // ISO timestamp when cell was created
}

interface NotebookCodeState {
  // Map of notebookId -> array of code cells
  codeCellsByNotebook: Record<string, CodeCell[]>;
}

interface NotebookCodeActions {
  // Get all code cells for a notebook (creates default if doesn't exist)
  getCodeCells: (notebookId: string) => CodeCell[];

  // Get a specific cell by notebook and cell ID
  getCodeCell: (notebookId: string, cellId?: string) => CodeCell;

  // Add a new cell to a notebook
  addCell: (
    notebookId: string,
    code?: string,
    creationContext?: { messageId?: string; toolCallId?: string },
  ) => string; // Returns new cell ID

  // Update code for a specific cell
  updateCode: (notebookId: string, cellId: string, code: string) => void;

  // Update execution results for a specific cell
  updateExecutionResult: (
    notebookId: string,
    cellId: string,
    output: string[],
    error: string | null,
  ) => void;

  // Delete a cell from a notebook
  deleteCell: (notebookId: string, cellId: string) => void;

  // Clear all data for a notebook
  clearNotebook: (notebookId: string) => void;

  // Clear all data
  clearAll: () => void;
}

const DEFAULT_CODE = 'print("Hello, World!")';

const generateCellId = () =>
  `cell-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useNotebookCodeStore = create<
  NotebookCodeState & NotebookCodeActions
>()(
  persist(
    (set, get) => ({
      // Initial state
      codeCellsByNotebook: {},

      // Actions
      getCodeCells: (notebookId: string) => {
        const existing = get().codeCellsByNotebook[notebookId];
        if (existing && existing.length > 0) {
          return existing;
        }

        // Create default cell if no cells exist
        const defaultCell: CodeCell = {
          id: generateCellId(),
          code: DEFAULT_CODE,
          output: [],
          error: null,
          createdAt: new Date().toISOString(),
        };

        // Store it
        set((state) => ({
          codeCellsByNotebook: {
            ...state.codeCellsByNotebook,
            [notebookId]: [defaultCell],
          },
        }));

        return [defaultCell];
      },

      getCodeCell: (notebookId: string, cellId?: string) => {
        const cells = get().getCodeCells(notebookId);

        if (cellId) {
          const cell = cells.find((c) => c.id === cellId);
          if (!cell) {
            throw new Error(
              `Cell ${cellId} not found in notebook ${notebookId}`,
            );
          }
          return cell;
        }

        // Return first cell if no cellId specified (backward compatibility)
        return cells[0];
      },

      addCell: (
        notebookId: string,
        code?: string,
        creationContext?: { messageId?: string; toolCallId?: string },
      ) => {
        const newCellId = generateCellId();
        const newCell: CodeCell = {
          id: newCellId,
          code: code || DEFAULT_CODE,
          output: [],
          error: null,
          createdByMessageId: creationContext?.messageId,
          createdByToolCallId: creationContext?.toolCallId,
          createdAt: new Date().toISOString(),
        };

        set((state) => {
          const existingCells = state.codeCellsByNotebook[notebookId] || [];
          return {
            codeCellsByNotebook: {
              ...state.codeCellsByNotebook,
              [notebookId]: [...existingCells, newCell],
            },
          };
        });

        return newCellId;
      },

      updateCode: (notebookId: string, cellId: string, code: string) => {
        set((state) => {
          const cells = state.codeCellsByNotebook[notebookId] || [];
          const updatedCells = cells.map((cell) =>
            cell.id === cellId ? { ...cell, code } : cell,
          );

          return {
            codeCellsByNotebook: {
              ...state.codeCellsByNotebook,
              [notebookId]: updatedCells,
            },
          };
        });
      },

      updateExecutionResult: (
        notebookId: string,
        cellId: string,
        output: string[],
        error: string | null,
      ) => {
        set((state) => {
          const cells = state.codeCellsByNotebook[notebookId] || [];
          const updatedCells = cells.map((cell) =>
            cell.id === cellId
              ? {
                  ...cell,
                  output,
                  error,
                  lastExecuted: new Date().toISOString(),
                }
              : cell,
          );

          return {
            codeCellsByNotebook: {
              ...state.codeCellsByNotebook,
              [notebookId]: updatedCells,
            },
          };
        });
      },

      deleteCell: (notebookId: string, cellId: string) => {
        set((state) => {
          const cells = state.codeCellsByNotebook[notebookId] || [];
          const filteredCells = cells.filter((cell) => cell.id !== cellId);

          // Ensure at least one cell remains
          const finalCells =
            filteredCells.length > 0
              ? filteredCells
              : [
                  {
                    id: generateCellId(),
                    code: DEFAULT_CODE,
                    output: [],
                    error: null,
                    createdAt: new Date().toISOString(),
                  },
                ];

          return {
            codeCellsByNotebook: {
              ...state.codeCellsByNotebook,
              [notebookId]: finalCells,
            },
          };
        });
      },

      clearNotebook: (notebookId: string) => {
        set((state) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [notebookId]: _removed, ...rest } = state.codeCellsByNotebook;
          return {
            codeCellsByNotebook: rest,
          };
        });
      },

      clearAll: () => {
        set({
          codeCellsByNotebook: {},
        });
      },
    }),
    {
      name: 'notebook-code-storage',
      // Only persist the code cells, not execution results (they should be fresh each session)
      partialize: (state) => ({
        codeCellsByNotebook: Object.fromEntries(
          Object.entries(state.codeCellsByNotebook).map(
            ([notebookId, cells]) => {
              // Handle migration from old single-cell format to new array format
              const cellsArray = Array.isArray(cells) ? cells : [cells];
              return [
                notebookId,
                cellsArray.map((cell) => ({
                  ...cell,
                  output: [], // Don't persist output
                  error: null, // Don't persist errors
                  lastExecuted: undefined, // Don't persist execution timestamp
                })),
              ];
            },
          ),
        ),
      }),
      // Handle migration from old single-cell format when rehydrating
      onRehydrateStorage: () => (state) => {
        if (state?.codeCellsByNotebook) {
          // Migrate any single cells to arrays
          const migratedCells = Object.fromEntries(
            Object.entries(state.codeCellsByNotebook).map(
              ([notebookId, cells]) => [
                notebookId,
                Array.isArray(cells) ? cells : [cells],
              ],
            ),
          );
          state.codeCellsByNotebook = migratedCells;
        }
      },
    },
  ),
);
