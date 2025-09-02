import { useState, useCallback, useEffect } from 'react';
import {
  FaPlay,
  FaStop,
  FaSpinner,
  FaExclamationTriangle,
} from 'react-icons/fa';
import { CodeEditor } from './CodeEditor';
import { usePyodideWorker } from '../hooks/usePyodideWorker';
import { useNotebookCodeStore } from '../store/notebookCodeStore';

interface NotebookCellProps {
  notebookId?: string; // If provided, will persist code for this notebook
  initialCode?: string; // Fallback if no notebookId provided
  onCodeChange?: (code: string) => void;
}

export function NotebookCell({
  notebookId,
  initialCode = 'print("Hello, World!")',
  onCodeChange,
}: NotebookCellProps) {
  const { getCodeCell, updateCode, updateExecutionResult } =
    useNotebookCodeStore();

  // Get persisted code or use initialCode
  const persistedCell = notebookId ? getCodeCell(notebookId) : null;
  const [code, setCode] = useState(persistedCell?.code || initialCode);
  const [output, setOutput] = useState<string[]>(persistedCell?.output || []);
  const [error, setError] = useState<string | null>(
    persistedCell?.error || null,
  );

  // Sync with persisted state when notebookId changes
  useEffect(() => {
    if (notebookId) {
      const cell = getCodeCell(notebookId);
      setCode(cell.code);
      setOutput(cell.output);
      setError(cell.error);
    }
  }, [notebookId, getCodeCell]);

  const handleOutputChange = useCallback(
    (newOutput: string[], newError: string | null) => {
      setOutput([...newOutput]);
      setError(newError);

      // Persist execution results if we have a notebookId
      if (notebookId) {
        updateExecutionResult(notebookId, newOutput, newError);
      }
    },
    [notebookId, updateExecutionResult],
  );

  const {
    isReady,
    isExecuting,
    executionState,
    executeCode,
    interruptExecution,
    initError,
    supportsSharedArrayBuffer,
  } = usePyodideWorker({
    onOutputChange: handleOutputChange,
  });

  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode);
      onCodeChange?.(newCode);

      // Persist code if we have a notebookId
      if (notebookId) {
        updateCode(notebookId, newCode);
      }
    },
    [onCodeChange, notebookId, updateCode],
  );

  const handleExecute = async () => {
    if (!isReady || isExecuting) return;

    // Clear previous output
    setOutput([]);
    setError(null);

    // Execute the code
    await executeCode(code);
  };

  const handleInterrupt = () => {
    interruptExecution();
  };

  return (
    <div
      className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm"
      data-testid="notebook-cell"
    >
      {/* Cell Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Python Code</span>
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
          {executionState === 'running' ? (
            <button
              onClick={handleInterrupt}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 
                       transition-colors flex items-center space-x-1 cursor-pointer"
              title="Stop execution"
              data-testid="stop-button"
            >
              <FaStop className="w-3 h-3" />
              <span>Stop</span>
            </button>
          ) : executionState === 'stopping' ? (
            <button
              disabled
              className="px-3 py-1 text-sm bg-gray-500 text-white rounded flex items-center space-x-1 cursor-not-allowed"
              title="Stopping execution..."
              data-testid="stopping-button"
            >
              <FaSpinner className="w-3 h-3 animate-spin" />
              <span>Stopping...</span>
            </button>
          ) : (
            <button
              onClick={handleExecute}
              disabled={!isReady}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 
                       disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors 
                       flex items-center space-x-1 cursor-pointer"
              title="Run code"
              data-testid="run-button"
            >
              <FaPlay className="w-3 h-3" />
              <span>Run</span>
            </button>
          )}
        </div>
      </div>

      {/* Code Editor */}
      <div className="relative">
        <CodeEditor
          value={code}
          onChange={handleCodeChange}
          language="python"
          height={150}
          placeholder="# Enter Python code here..."
        />
        {executionState === 'running' && (
          <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs flex items-center">
            <FaSpinner className="animate-spin mr-1" />
            Running...
          </div>
        )}
        {executionState === 'stopping' && (
          <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs flex items-center">
            <FaSpinner className="animate-spin mr-1" />
            Stopping...
          </div>
        )}
      </div>

      {/* Output Section */}
      {(output.length > 0 || error) && (
        <div className="border-t border-gray-200">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-700">Output</span>
          </div>
          <div className="p-4">
            {/* Standard Output */}
            {output.length > 0 && (
              <div className="mb-2">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono bg-gray-50 p-3 rounded border">
                  {output.join('')}
                </pre>
              </div>
            )}

            {/* Error Output */}
            {error && (
              <div className="mb-2">
                <pre className="text-sm text-red-700 whitespace-pre-wrap font-mono bg-red-50 p-3 rounded border border-red-200">
                  {error}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
