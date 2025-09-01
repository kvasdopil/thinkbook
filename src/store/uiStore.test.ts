import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from './uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    // Reset the store state before each test
    useUiStore.getState().setNotebookPanelCollapsed(false);
  });

  it('should have initial state with notebook panel not collapsed', () => {
    const { isNotebookPanelCollapsed } = useUiStore.getState();
    expect(isNotebookPanelCollapsed).toBe(false);
  });

  it('should toggle notebook panel state', () => {
    const store = useUiStore.getState();

    expect(store.isNotebookPanelCollapsed).toBe(false);

    store.toggleNotebookPanel();
    expect(useUiStore.getState().isNotebookPanelCollapsed).toBe(true);

    store.toggleNotebookPanel();
    expect(useUiStore.getState().isNotebookPanelCollapsed).toBe(false);
  });

  it('should set notebook panel collapsed state directly', () => {
    const store = useUiStore.getState();

    store.setNotebookPanelCollapsed(true);
    expect(useUiStore.getState().isNotebookPanelCollapsed).toBe(true);

    store.setNotebookPanelCollapsed(false);
    expect(useUiStore.getState().isNotebookPanelCollapsed).toBe(false);
  });
});
