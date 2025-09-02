import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CodeCell {
  id: string;
  code: string;
  output: string[];
  error: string | null;
  lastExecuted?: string; // ISO timestamp
}

interface NotebookCodeState {
  // Map of notebookId -> codeCell
  codeCellsByNotebook: Record<string, CodeCell>;
}

interface NotebookCodeActions {
  // Get code cell for a notebook (creates default if doesn't exist)
  getCodeCell: (notebookId: string) => CodeCell;

  // Update code for a notebook
  updateCode: (notebookId: string, code: string) => void;

  // Update execution results for a notebook
  updateExecutionResult: (
    notebookId: string,
    output: string[],
    error: string | null,
  ) => void;

  // Clear all data for a notebook
  clearNotebook: (notebookId: string) => void;

  // Clear all data
  clearAll: () => void;
}

const DEFAULT_CODE = 'print("Hello, World!")';

export const useNotebookCodeStore = create<
  NotebookCodeState & NotebookCodeActions
>()(
  persist(
    (set, get) => ({
      // Initial state
      codeCellsByNotebook: {},

      // Actions
      getCodeCell: (notebookId: string) => {
        const existing = get().codeCellsByNotebook[notebookId];
        if (existing) {
          return existing;
        }

        // Create default cell
        const defaultCell: CodeCell = {
          id: `cell-${notebookId}`,
          code: DEFAULT_CODE,
          output: [],
          error: null,
        };

        // Store it
        set((state) => ({
          codeCellsByNotebook: {
            ...state.codeCellsByNotebook,
            [notebookId]: defaultCell,
          },
        }));

        return defaultCell;
      },

      updateCode: (notebookId: string, code: string) => {
        set((state) => {
          const existing = state.codeCellsByNotebook[notebookId] || {
            id: `cell-${notebookId}`,
            code: DEFAULT_CODE,
            output: [],
            error: null,
          };

          return {
            codeCellsByNotebook: {
              ...state.codeCellsByNotebook,
              [notebookId]: {
                ...existing,
                code,
              },
            },
          };
        });
      },

      updateExecutionResult: (
        notebookId: string,
        output: string[],
        error: string | null,
      ) => {
        set((state) => {
          const existing = state.codeCellsByNotebook[notebookId];
          if (!existing) return state;

          return {
            codeCellsByNotebook: {
              ...state.codeCellsByNotebook,
              [notebookId]: {
                ...existing,
                output,
                error,
                lastExecuted: new Date().toISOString(),
              },
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
            ([notebookId, cell]) => [
              notebookId,
              {
                ...cell,
                output: [], // Don't persist output
                error: null, // Don't persist errors
                lastExecuted: undefined, // Don't persist execution timestamp
              },
            ],
          ),
        ),
      }),
    },
  ),
);
