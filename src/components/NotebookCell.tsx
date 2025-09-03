import {
  useState,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  FaPlay,
  FaStop,
  FaSpinner,
  FaExclamationTriangle,
  FaCheck,
  FaTimes,
  FaRegEye,
  FaRegEyeSlash,
  FaTrash,
} from 'react-icons/fa';
import { CodeEditor } from './CodeEditor';
import { useSharedPyodide } from '../hooks/useSharedPyodide';
import { useNotebookCodeStore } from '../store/notebookCodeStore';

// Utility function to extract top-level comment from Python code
function extractTopLevelComment(code: string): string | null {
  const lines = code.split('\n');
  const firstNonEmptyLine = lines.find((line) => line.trim());
  if (firstNonEmptyLine?.trim().startsWith('#')) {
    return firstNonEmptyLine.replace(/^#\s*/, '').trim();
  }
  return null;
}

interface NotebookCellProps {
  notebookId?: string; // If provided, will persist code for this notebook
  cellId?: string; // If provided, will use this specific cell
  initialCode?: string; // Fallback if no notebookId provided
  onCodeChange?: (code: string) => void;
  onDelete?: () => void; // Called when delete button is pressed
  showDeleteButton?: boolean; // Whether to show delete button
  disabled?: boolean; // Whether the cell is disabled (e.g., during Run All)
}

export interface NotebookCellHandle {
  executeCode: () => Promise<void>;
  isExecuting: boolean;
}

export const NotebookCell = forwardRef<NotebookCellHandle, NotebookCellProps>(
  (
    {
      notebookId,
      cellId,
      initialCode = 'print("Hello, World!")',
      onCodeChange,
      onDelete,
      showDeleteButton = false,
      disabled = false,
    },
    ref,
  ) => {
    const { getCodeCell, updateCode, updateExecutionResult } =
      useNotebookCodeStore();

    // Get persisted code or use initialCode
    const persistedCell =
      notebookId && cellId ? getCodeCell(notebookId, cellId) : null;
    const [code, setCode] = useState(persistedCell?.code || initialCode);
    const [output, setOutput] = useState<string[]>(persistedCell?.output || []);
    const [error, setError] = useState<string | null>(
      persistedCell?.error || null,
    );

    // Individual cell execution state
    const [cellExecutionState, setCellExecutionState] = useState<
      'idle' | 'running' | 'stopping' | 'cancelled' | 'complete' | 'failed'
    >('idle');

    // Visibility toggle state - default to hidden per spec
    const [isEditorVisible, setIsEditorVisible] = useState(false);

    // Sync with persisted state when notebookId or cellId changes
    useEffect(() => {
      if (notebookId && cellId) {
        const cell = getCodeCell(notebookId, cellId);
        setCode(cell.code);
        setOutput(cell.output);
        setError(cell.error);
      }
    }, [notebookId, cellId, getCodeCell]);

    const handleOutputChange = useCallback(
      (newOutput: string[], newError: string | null) => {
        setOutput([...newOutput]);
        setError(newError);

        // Persist execution results if we have a notebookId and cellId
        if (notebookId && cellId) {
          updateExecutionResult(notebookId, cellId, newOutput, newError);
        }
      },
      [notebookId, cellId, updateExecutionResult],
    );

    const {
      isReady,
      executeCode: sharedExecuteCode,
      interruptExecution,
      initError,
      supportsSharedArrayBuffer,
    } = useSharedPyodide();

    const handleCodeChange = useCallback(
      (newCode: string) => {
        setCode(newCode);
        onCodeChange?.(newCode);

        // Persist code if we have a notebookId and cellId
        if (notebookId && cellId) {
          updateCode(notebookId, cellId, newCode);
        }
      },
      [onCodeChange, notebookId, cellId, updateCode],
    );

    const handleExecute = useCallback(async () => {
      if (!isReady || cellExecutionState === 'running' || disabled) return;

      // Clear previous output
      setOutput([]);
      setError(null);
      setCellExecutionState('running');

      try {
        // Execute the code with cell-specific output handler
        const result = await sharedExecuteCode(code, handleOutputChange);

        if (result.error) {
          setCellExecutionState('failed');
        } else {
          setCellExecutionState('complete');
        }
      } catch (error) {
        console.error('Cell execution error:', error);
        setError(error instanceof Error ? error.message : String(error));
        setCellExecutionState('failed');
      }
    }, [
      isReady,
      cellExecutionState,
      disabled,
      sharedExecuteCode,
      code,
      handleOutputChange,
    ]);

    // Expose methods to parent via ref
    useImperativeHandle(
      ref,
      () => ({
        executeCode: handleExecute,
        isExecuting: cellExecutionState === 'running',
      }),
      [handleExecute, cellExecutionState],
    );

    const handleInterrupt = () => {
      if (cellExecutionState === 'running') {
        setCellExecutionState('stopping');
        interruptExecution();
      }
    };

    const toggleEditorVisibility = () => {
      setIsEditorVisible(!isEditorVisible);
    };

    // Status indicator configuration
    const getStatusConfig = () => {
      switch (cellExecutionState) {
        case 'idle':
          return {
            icon: null,
            color: 'text-gray-400',
            bgColor: 'bg-gray-100',
            hoverBgColor: 'hover:bg-gray-200',
            label: 'Run',
          };
        case 'running':
          return {
            icon: FaSpinner,
            color: 'text-blue-600',
            bgColor: 'bg-blue-100',
            hoverBgColor: 'hover:bg-blue-200',
            label: 'Stop',
            animate: 'animate-spin',
          };
        case 'stopping':
          return {
            icon: FaSpinner,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-100',
            hoverBgColor: 'hover:bg-yellow-200',
            label: 'Stopping',
            animate: 'animate-spin',
          };
        case 'complete':
          return {
            icon: FaCheck,
            color: 'text-green-600',
            bgColor: 'bg-green-100',
            hoverBgColor: 'hover:bg-green-200',
            label: 'Run',
          };
        case 'failed':
          return {
            icon: FaExclamationTriangle,
            color: 'text-red-600',
            bgColor: 'bg-red-100',
            hoverBgColor: 'hover:bg-red-200',
            label: 'Run',
          };
        case 'cancelled':
          return {
            icon: FaTimes,
            color: 'text-gray-600',
            bgColor: 'bg-gray-100',
            hoverBgColor: 'hover:bg-gray-200',
            label: 'Run',
          };
        default:
          return {
            icon: null,
            color: 'text-gray-400',
            bgColor: 'bg-gray-100',
            hoverBgColor: 'hover:bg-gray-200',
            label: 'Run',
          };
      }
    };

    const statusConfig = getStatusConfig();
    const topLevelComment = extractTopLevelComment(code);
    const cellTitle = topLevelComment || 'Python Code';

    if (!isEditorVisible) {
      // Collapsed state - compact view with status, title, and expand button
      const borderColor =
        cellExecutionState === 'running'
          ? 'border-blue-200'
          : 'border-gray-200';
      return (
        <>
          <div
            className={`inline-flex items-center bg-white border ${borderColor} rounded-lg px-3 py-2 max-w-sm transition-all duration-200`}
            data-testid="notebook-cell"
          >
            {/* Status Button */}
            <button
              onClick={
                cellExecutionState === 'running'
                  ? handleInterrupt
                  : handleExecute
              }
              disabled={
                (!isReady && cellExecutionState !== 'running') || disabled
              }
              className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 text-xs transition-colors cursor-pointer ${statusConfig.bgColor} ${statusConfig.hoverBgColor} ${statusConfig.color} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={
                disabled ? 'Cell disabled during Run All' : statusConfig.label
              }
              data-testid={
                cellExecutionState === 'running' ? 'stop-button' : 'run-button'
              }
              aria-label={statusConfig.label}
            >
              {statusConfig.icon && (
                <statusConfig.icon
                  className={`w-3 h-3 ${statusConfig.animate || ''}`}
                />
              )}
            </button>

            {/* Cell Title */}
            <span className="text-sm font-medium text-gray-700 flex-1 truncate mr-2">
              {cellTitle}
            </span>

            {/* Delete Button */}
            {showDeleteButton && (
              <button
                onClick={onDelete}
                className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer mr-2"
                title="Delete cell"
                data-testid="delete-cell"
                aria-label="Delete cell"
              >
                <FaTrash className="w-3 h-3" />
              </button>
            )}

            {/* Toggle Visibility Button */}
            <button
              onClick={toggleEditorVisibility}
              className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              title="Show code editor"
              data-testid="toggle-visibility"
              aria-label="Show code editor"
            >
              <FaRegEye className="w-4 h-4" />
            </button>
          </div>

          {/* Output Section - Visible below collapsed cell, similar to design */}
          {(output.length > 0 || error) && (
            <div className="ml-9 mt-2">
              <div className="bg-gray-900 text-gray-100 rounded-lg p-3 font-mono text-sm">
                {/* Standard Output */}
                {output.length > 0 && (
                  <pre className="text-gray-100 whitespace-pre-wrap">
                    {output.join('')}
                  </pre>
                )}

                {/* Error Output */}
                {error && (
                  <pre className="text-red-400 whitespace-pre-wrap">
                    {error}
                  </pre>
                )}
              </div>
            </div>
          )}
        </>
      );
    }

    // Expanded state - full editor view
    return (
      <div
        className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm transition-all duration-200"
        data-testid="notebook-cell"
      >
        {/* Cell Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {/* Status Button */}
            <button
              onClick={
                cellExecutionState === 'running'
                  ? handleInterrupt
                  : handleExecute
              }
              disabled={
                (!isReady && cellExecutionState !== 'running') || disabled
              }
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors cursor-pointer ${statusConfig.bgColor} ${statusConfig.hoverBgColor} ${statusConfig.color} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={
                disabled ? 'Cell disabled during Run All' : statusConfig.label
              }
              data-testid={
                cellExecutionState === 'running' ? 'stop-button' : 'run-button'
              }
              aria-label={statusConfig.label}
            >
              {statusConfig.icon && (
                <statusConfig.icon
                  className={`w-3 h-3 ${statusConfig.animate || ''}`}
                />
              )}
            </button>

            {/* Cell Title */}
            <span className="text-sm font-medium text-gray-700">
              {cellTitle}
            </span>

            {/* Status Messages */}
            {!isReady && !initError && (
              <span className="text-xs text-yellow-600 flex items-center">
                <FaSpinner className="animate-spin mr-1" />
                Loading Python...
              </span>
            )}
            {initError && (
              <span
                className="text-xs text-red-600 flex items-center"
                title={initError}
              >
                ⚠️ Python initialization failed
              </span>
            )}
            {supportsSharedArrayBuffer === false && (
              <div className="text-xs text-yellow-600 flex items-center">
                <FaExclamationTriangle className="mr-1" />
                Immediate cancellation unavailable
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Run/Stop Button */}
            {cellExecutionState === 'running' ? (
              <button
                onClick={handleInterrupt}
                className="text-xs bg-red-100 hover:bg-red-200 px-2 py-1 rounded text-red-600 transition-colors cursor-pointer"
                title="Stop execution"
                data-testid="run-stop-button"
              >
                <FaStop className="inline mr-1" />
                Stop
              </button>
            ) : cellExecutionState === 'stopping' ? (
              <button
                disabled
                className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 cursor-not-allowed"
                title="Stopping execution..."
              >
                <FaSpinner className="animate-spin inline mr-1" />
                Stopping
              </button>
            ) : (
              <button
                onClick={handleExecute}
                disabled={!isReady || disabled}
                className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-600 transition-colors disabled:cursor-not-allowed cursor-pointer"
                title={disabled ? 'Cell disabled during Run All' : 'Run code'}
                data-testid="run-stop-button"
              >
                <FaPlay className="inline mr-1" />
                Run
              </button>
            )}

            {/* Delete Button */}
            {showDeleteButton && (
              <button
                onClick={onDelete}
                className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                title="Delete cell"
                data-testid="delete-cell"
                aria-label="Delete cell"
              >
                <FaTrash className="w-4 h-4" />
              </button>
            )}

            {/* Toggle Visibility Button */}
            <button
              onClick={toggleEditorVisibility}
              className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              title="Hide code editor"
              data-testid="toggle-visibility"
              aria-label="Hide code editor"
            >
              <FaRegEyeSlash className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Code Editor */}
        <div className="relative">
          <CodeEditor
            value={code}
            onChange={disabled ? () => {} : handleCodeChange}
            language="python"
            height={150}
            placeholder="# Enter Python code here..."
            readOnly={disabled || cellExecutionState === 'running'}
          />
          {cellExecutionState === 'running' && (
            <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs flex items-center">
              <FaSpinner className="animate-spin mr-1" />
              Running...
            </div>
          )}
          {cellExecutionState === 'stopping' && (
            <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs flex items-center">
              <FaSpinner className="animate-spin mr-1" />
              Stopping...
            </div>
          )}
        </div>

        {/* Output Section - Same styling as collapsed mode */}
        {(output.length > 0 || error) && (
          <div className="border-t border-gray-200">
            <div className="px-4 py-3">
              <div className="bg-gray-900 text-gray-100 rounded-lg p-3 font-mono text-sm">
                {/* Standard Output */}
                {output.length > 0 && (
                  <pre className="text-gray-100 whitespace-pre-wrap">
                    {output.join('')}
                  </pre>
                )}

                {/* Error Output */}
                {error && (
                  <pre className="text-red-400 whitespace-pre-wrap">
                    {error}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);
