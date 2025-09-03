import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MultipleNotebookCells } from './MultipleNotebookCells';
import { useNotebookCodeStore } from '../store/notebookCodeStore';

// Mock the NotebookCell component
vi.mock('./NotebookCell', () => ({
  NotebookCell: vi.fn(({ cellId, onDelete, showDeleteButton, disabled }) => (
    <div data-testid={`notebook-cell-${cellId}`}>
      <span>Cell {cellId}</span>
      {showDeleteButton && (
        <button onClick={onDelete} data-testid={`delete-${cellId}`}>
          Delete
        </button>
      )}
      {disabled && <span data-testid={`disabled-${cellId}`}>Disabled</span>}
    </div>
  )),
}));

// Mock zustand persist middleware for testing
vi.mock('zustand/middleware', () => ({
  persist: (fn: unknown) => fn,
}));

describe('MultipleNotebookCells', () => {
  beforeEach(() => {
    // Clear the store before each test
    const { clearAll } = useNotebookCodeStore.getState();
    clearAll();
  });

  describe('without notebookId', () => {
    it('should render controls and fallback cells when no notebookId provided', () => {
      render(<MultipleNotebookCells />);

      // Should render controls (but Run All should be disabled)
      expect(screen.getByTestId('run-all-button')).toBeInTheDocument();
      expect(screen.getByTestId('run-all-button')).toBeDisabled();
      expect(screen.getByTestId('add-cell-button')).toBeInTheDocument();

      // Should render at least one cell (using fallback temp-notebook ID)
      expect(screen.getAllByText(/Cell cell-/)).toHaveLength(1);
    });
  });

  describe('with notebookId', () => {
    it('should render controls and default cell', () => {
      render(<MultipleNotebookCells notebookId="test-notebook" />);

      // Should render controls
      expect(screen.getByTestId('run-all-button')).toBeInTheDocument();
      expect(screen.getByTestId('add-cell-button')).toBeInTheDocument();

      // Should have one cell initially
      expect(screen.getAllByText(/Cell cell-/)).toHaveLength(1);
    });

    it('should add new cell when Add Cell button is clicked', async () => {
      render(<MultipleNotebookCells notebookId="test-notebook" />);

      // Initially one cell
      expect(screen.getAllByText(/Cell cell-/)).toHaveLength(1);

      // Click add cell
      fireEvent.click(screen.getByTestId('add-cell-button'));

      // Should now have two cells
      await waitFor(() => {
        expect(screen.getAllByText(/Cell cell-/)).toHaveLength(2);
      });
    });

    it('should show delete buttons only when more than one cell exists', async () => {
      render(<MultipleNotebookCells notebookId="test-notebook" />);

      // Initially one cell, no delete button
      expect(screen.queryByTestId(/delete-/)).not.toBeInTheDocument();

      // Add another cell
      fireEvent.click(screen.getByTestId('add-cell-button'));

      // Now should have delete buttons
      await waitFor(() => {
        expect(screen.getAllByText('Delete')).toHaveLength(2);
      });
    });

    it('should show delete confirmation when delete button is clicked', async () => {
      render(<MultipleNotebookCells notebookId="test-notebook" />);

      // Add a second cell so delete buttons appear
      fireEvent.click(screen.getByTestId('add-cell-button'));

      await waitFor(() => {
        expect(screen.getAllByText('Delete')).toHaveLength(2);
      });

      // Click delete on first cell
      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      // Should show confirmation
      await waitFor(() => {
        expect(
          screen.getByText(/Are you sure you want to delete this cell/),
        ).toBeInTheDocument();
        expect(screen.getByTestId('confirm-delete')).toBeInTheDocument();
        expect(screen.getByTestId('cancel-delete')).toBeInTheDocument();
      });
    });

    it('should delete cell when confirmation is clicked', async () => {
      const { getCodeCells } = useNotebookCodeStore.getState();
      render(<MultipleNotebookCells notebookId="test-notebook" />);

      // Add a second cell
      fireEvent.click(screen.getByTestId('add-cell-button'));

      await waitFor(() => {
        expect(screen.getAllByText(/Cell cell-/)).toHaveLength(2);
      });

      // Get cell IDs before deletion
      const cellsBefore = getCodeCells('test-notebook');
      const firstCellId = cellsBefore[0].id;

      // Click delete on first cell
      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      // Confirm deletion
      await waitFor(() => {
        expect(screen.getByTestId('confirm-delete')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('confirm-delete'));

      // Should have one cell remaining
      await waitFor(() => {
        expect(screen.getAllByText(/Cell cell-/)).toHaveLength(1);
      });

      // Verify the correct cell was deleted
      const cellsAfter = getCodeCells('test-notebook');
      expect(
        cellsAfter.find((cell) => cell.id === firstCellId),
      ).toBeUndefined();
    });

    it('should cancel deletion when cancel button is clicked', async () => {
      render(<MultipleNotebookCells notebookId="test-notebook" />);

      // Add a second cell
      fireEvent.click(screen.getByTestId('add-cell-button'));

      await waitFor(() => {
        expect(screen.getAllByText(/Cell cell-/)).toHaveLength(2);
      });

      // Click delete on first cell
      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      // Cancel deletion
      await waitFor(() => {
        expect(screen.getByTestId('cancel-delete')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('cancel-delete'));

      // Should still have two cells
      expect(screen.getAllByText(/Cell cell-/)).toHaveLength(2);

      // Confirmation dialog should be gone
      expect(
        screen.queryByText(/Are you sure you want to delete this cell/),
      ).not.toBeInTheDocument();
    });

    it('should enable Run All button when cells exist', () => {
      // Since we always maintain at least one cell, Run All should be enabled
      render(<MultipleNotebookCells notebookId="test-notebook" />);

      const runAllButton = screen.getByTestId('run-all-button');
      expect(runAllButton).not.toBeDisabled();
    });
  });
});
