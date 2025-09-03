import { useState, useRef } from 'react';
import { NotebookCell, type NotebookCellHandle } from './NotebookCell';
import { useNotebookCodeStore } from '../store/notebookCodeStore';
import { SharedPyodideProvider } from '../contexts/SharedPyodideContext';

interface CodeCell {
  id: string;
  code: string;
  output: string[];
  error: string | null;
  lastExecuted?: string;
  createdByMessageId?: string;
  createdByToolCallId?: string;
  createdAt?: string;
}

interface MessageCellsProps {
  cells: CodeCell[];
  notebookId: string;
}

/**
 * Renders code cells that were created by a specific message or are orphaned
 */
export function MessageCells({ cells, notebookId }: MessageCellsProps) {
  const { deleteCell } = useNotebookCodeStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null,
  );
  const executionRefs = useRef<Record<string, NotebookCellHandle>>({});

  if (cells.length === 0) {
    return null;
  }

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

  return (
    <SharedPyodideProvider>
      <div className="w-full space-y-4 mt-4">
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
              showDeleteButton={true} // Always allow deletion for message-associated cells
              disabled={false}
              ref={(ref: NotebookCellHandle | null) => {
                if (ref) {
                  executionRefs.current[cell.id] = ref;
                }
              }}
            />
          </div>
        ))}
      </div>
    </SharedPyodideProvider>
  );
}
