import { useState, useRef } from 'react';
import { FaPlay, FaPlus } from 'react-icons/fa';
import { NotebookCell, type NotebookCellHandle } from './NotebookCell';
import { useNotebookCodeStore } from '../store/notebookCodeStore';
import { SharedPyodideProvider } from '../contexts/SharedPyodideContext';

interface MultipleNotebookCellsProps {
  notebookId?: string;
}

export function MultipleNotebookCells({
  notebookId,
}: MultipleNotebookCellsProps) {
  // Use provided notebookId or fallback to temp notebook
  const effectiveNotebookId = notebookId || 'temp-notebook';

  return (
    <SharedPyodideProvider>
      <MultipleNotebookCellsContent notebookId={effectiveNotebookId} />
    </SharedPyodideProvider>
  );
}

function MultipleNotebookCellsContent({ notebookId }: { notebookId: string }) {
  const { getCodeCells, addCell, deleteCell } = useNotebookCodeStore();
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null,
  );
  const [executingCells, setExecutingCells] = useState<Set<string>>(new Set());
  const executionRefs = useRef<Record<string, NotebookCellHandle>>({});

  // Get cells for this notebook (notebookId is guaranteed to be defined here)
  const cells = getCodeCells(notebookId);

  const handleAddCell = () => {
    addCell(notebookId);
  };

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
          setExecutingCells((prev) => new Set([...prev, cell.id]));
          try {
            await cellExecution.executeCode();
          } finally {
            setExecutingCells((prev) => {
              const newSet = new Set(prev);
              newSet.delete(cell.id);
              return newSet;
            });
          }
        }
      }
    } catch (error) {
      console.error('Error during run all:', error);
    } finally {
      setIsRunningAll(false);
      setExecutingCells(new Set()); // Clear any remaining executing state
    }
  };

  // Check if any cell is running
  const anyCellRunning = executingCells.size > 0;

  const runAllDisabled = isRunningAll || anyCellRunning || cells.length === 0;

  return (
    <div className="w-full space-y-4">
      {/* Controls */}
      <div className="flex items-center space-x-4 mb-4">
        {/* Run All Button */}
        <button
          onClick={handleRunAll}
          disabled={runAllDisabled}
          className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
          title="Run all cells sequentially"
          data-testid="run-all-button"
        >
          <FaPlay className="w-4 h-4" />
          <span>Run All</span>
        </button>

        {/* Add Cell Button */}
        <button
          onClick={handleAddCell}
          className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer"
          title="Add new cell"
          data-testid="add-cell-button"
        >
          <FaPlus className="w-4 h-4" />
          <span>Add Cell</span>
        </button>
      </div>

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
}
