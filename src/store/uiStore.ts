import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  isNotebookPanelCollapsed: boolean;
  toggleNotebookPanel: () => void;
  setNotebookPanelCollapsed: (collapsed: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      isNotebookPanelCollapsed: false,
      toggleNotebookPanel: () =>
        set((state) => ({
          isNotebookPanelCollapsed: !state.isNotebookPanelCollapsed,
        })),
      setNotebookPanelCollapsed: (collapsed) =>
        set({ isNotebookPanelCollapsed: collapsed }),
    }),
    {
      name: 'ui-store',
    }
  )
);