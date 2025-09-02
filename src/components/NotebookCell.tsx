import { useState, useCallback } from 'react';
import { FaPlay, FaStop, FaSpinner } from 'react-icons/fa';
import { CodeEditor } from './CodeEditor';
import { usePyodideWorker } from '../hooks/usePyodideWorker';

interface NotebookCellProps {
  initialCode?: string;
  onCodeChange?: (code: string) => void;
}

export function NotebookCell({
  initialCode = 'print("Hello, World!")',
  onCodeChange,
}: NotebookCellProps) {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleOutputChange = useCallback(
    (newOutput: string[], newError: string | null) => {
      setOutput([...newOutput]);
      setError(newError);
    },
    [],
  );

  const { isReady, isExecuting, executeCode, interruptExecution, initError } =
    usePyodideWorker({
      onOutputChange: handleOutputChange,
    });

  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode);
      onCodeChange?.(newCode);
    },
    [onCodeChange],
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
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
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
        </div>
        <div className="flex items-center space-x-2">
          {isExecuting ? (
            <button
              onClick={handleInterrupt}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 
                       transition-colors flex items-center space-x-1 cursor-pointer"
              title="Interrupt execution"
            >
              <FaStop className="w-3 h-3" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              onClick={handleExecute}
              disabled={!isReady}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 
                       disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors 
                       flex items-center space-x-1 cursor-pointer"
              title="Run code"
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
        {isExecuting && (
          <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs flex items-center">
            <FaSpinner className="animate-spin mr-1" />
            Running...
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
