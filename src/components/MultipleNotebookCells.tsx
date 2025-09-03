import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { NotebookCell, type NotebookCellHandle } from './NotebookCell';
import { useNotebookCodeStore } from '../store/notebookCodeStore';
import { SharedPyodideProvider } from '../contexts/SharedPyodideContext';

interface MultipleNotebookCellsProps {
  notebookId?: string;
}

export interface MultipleNotebookCellsHandle {
  runAll: () => void;
  isRunAllDisabled: () => boolean;
}

export const MultipleNotebookCells = forwardRef<
  MultipleNotebookCellsHandle,
  MultipleNotebookCellsProps
>(({ notebookId }, ref) => {
  // Use provided notebookId or fallback to temp notebook
  const effectiveNotebookId = notebookId || 'temp-notebook';

  return (
    <SharedPyodideProvider>
      <MultipleNotebookCellsContent
        ref={ref}
        notebookId={effectiveNotebookId}
      />
    </SharedPyodideProvider>
  );
});

const MultipleNotebookCellsContent = forwardRef<
  MultipleNotebookCellsHandle,
  { notebookId: string }
>(({ notebookId }, ref) => {
  const { getCodeCells, deleteCell } = useNotebookCodeStore();
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null,
  );
  const executionRefs = useRef<Record<string, NotebookCellHandle>>({});

  // Get cells for this notebook (notebookId is guaranteed to be defined here)
  const cells = getCodeCells(notebookId);

  const handleDeleteCell = (cellId: string) => {
    if (showDeleteConfirm === cellId) {
      deleteCell(notebookId, cellId);
      setShowDeleteConfirm(null);
    } else {
      setShowDeleteConfirm(cellId);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(null);
  };

  const handleRunAll = async () => {
    if (isRunningAll) return;

    setIsRunningAll(true);
    try {
      // Execute cells sequentially top-to-bottom
      for (const cell of cells) {
        const cellExecution = executionRefs.current[cell.id];
        if (cellExecution) {
          await cellExecution.executeCode();
        }
      }
    } catch (error) {
      console.error('Error during run all:', error);
    } finally {
      setIsRunningAll(false);
    }
  };

  // Expose methods to parent via ref
  useImperativeHandle(
    ref,
    () => ({
      runAll: handleRunAll,
      isRunAllDisabled: () => isRunningAll || cells.length === 0,
    }),
    [handleRunAll, isRunningAll, cells.length],
  );

  return (
    <div className="w-full space-y-4">
      {/* Cells */}
      <div className="space-y-4">
        {cells.map((cell) => (
          <div key={cell.id} className="relative">
            {/* Delete Confirmation Modal */}
            {showDeleteConfirm === cell.id && (
              <div className="absolute top-0 left-0 right-0 bg-red-50 border border-red-200 rounded-lg p-4 z-10 mb-4">
                <p className="text-red-800 mb-3">
                  Are you sure you want to delete this cell? This action cannot
                  be undone.
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleDeleteCell(cell.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors cursor-pointer"
                    data-testid="confirm-delete"
                  >
                    Delete
                  </button>
                  <button
                    onClick={handleCancelDelete}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors cursor-pointer"
                    data-testid="cancel-delete"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <NotebookCell
              key={cell.id}
              notebookId={notebookId}
              cellId={cell.id}
              onDelete={() => handleDeleteCell(cell.id)}
              showDeleteButton={cells.length > 1} // Only show delete if more than one cell
              disabled={false} // Let Run All handle execution order
              ref={(ref: NotebookCellHandle | null) => {
                if (ref) {
                  executionRefs.current[cell.id] = ref;
                }
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
});
