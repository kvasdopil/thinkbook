"use client";

import { useState, useEffect, useRef } from "react";
import { FaPlay, FaPlus } from "react-icons/fa";
import CodeCell, { ExecutionState } from "../components/CodeCell";
import ChatInterface from "../components/ChatInterface";
import type { WorkerResponseMessage } from "../types/worker-messages";
import type { CellData } from "../types/ai-functions";

interface OutputLine {
  type: "out" | "err" | "system";
  value: string;
  timestamp: number;
}

interface Cell {
  id: number;
  code: string;
  output: OutputLine[];
  executionState: ExecutionState;
}

export default function Home() {
  const [cells, setCells] = useState<Cell[]>([
    {
      id: 0,
      code: `# Demo script with streaming output
import time

for i in range(5):
    time.sleep(1)
    print(f"Hello {i}")
    
print("All done!")`,
      output: [],
      executionState: ExecutionState.NEW,
    },
  ]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(
    null
  );
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [runAllQueue, setRunAllQueue] = useState<number[]>([]);
  const [sharedArrayBufferSupported, setSharedArrayBufferSupported] =
    useState(false);
  const [nextCellId, setNextCellId] = useState(1);
  const workerRef = useRef<Worker | null>(null);
  const interruptBufferRef = useRef<Uint8Array | null>(null);
  const executionIdRef = useRef(0);
  const currentExecutingCellIdRef = useRef<number | null>(null);

  // Check SharedArrayBuffer availability
  useEffect(() => {
    const isSupported = typeof SharedArrayBuffer !== "undefined";
    setSharedArrayBufferSupported(isSupported);

    if (!isSupported) {
      console.error(
        "SharedArrayBuffer is not available. Cancellation will not work."
      );
      console.error(
        "This may be due to missing security headers or browser compatibility."
      );
      console.error(
        "Required headers: Cross-Origin-Embedder-Policy: require-corp, Cross-Origin-Opener-Policy: same-origin"
      );
    }
  }, []);

  // Add a new output line to specific cell
  const addOutputLine = (
    cellId: number,
    type: "out" | "err" | "system",
    value: string
  ) => {
    setCells((prev) =>
      prev.map((cell) =>
        cell.id === cellId
          ? {
              ...cell,
              output: [...cell.output, { type, value, timestamp: Date.now() }],
            }
          : cell
      )
    );
  };

  // Clear output for specific cell
  const clearCellOutput = (cellId: number) => {
    setCells((prev) =>
      prev.map((cell) => (cell.id === cellId ? { ...cell, output: [] } : cell))
    );
  };

  // Update cell execution state
  const updateCellExecutionState = (cellId: number, state: ExecutionState) => {
    setCells((prev) =>
      prev.map((cell) =>
        cell.id === cellId ? { ...cell, executionState: state } : cell
      )
    );
  };

  // Initialize the web worker
  useEffect(() => {
    const worker = new Worker(new URL("./pyodide-worker.ts", import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerResponseMessage>) => {
      const message = event.data;

      switch (message.type) {
        case "init-complete":
          setIsInitialized(true);
          setCells((prev) =>
            prev.map((cell) => ({
              ...cell,
              executionState: ExecutionState.NEW,
            }))
          );
          if (sharedArrayBufferSupported) {
            // Create and share interrupt buffer
            try {
              const buffer = new Uint8Array(new SharedArrayBuffer(1));
              interruptBufferRef.current = buffer;
              worker.postMessage({
                type: "setInterruptBuffer",
                interruptBuffer: buffer,
              });
              console.log(
                "Pyodide initialized successfully with SharedArrayBuffer cancellation support. Ready to run Python code!"
              );
            } catch (error) {
              console.error("Failed to create SharedArrayBuffer:", error);
            }
          }
          break;
        case "out":
          if (message.value && currentExecutingCellIdRef.current !== null) {
            addOutputLine(
              currentExecutingCellIdRef.current,
              "out",
              message.value
            );
          }
          break;
        case "err":
          if (message.value && currentExecutingCellIdRef.current !== null) {
            addOutputLine(
              currentExecutingCellIdRef.current,
              "err",
              message.value
            );
          }
          break;
        case "execution-complete":
          if (currentExecutingCellIdRef.current !== null) {
            updateCellExecutionState(
              currentExecutingCellIdRef.current,
              ExecutionState.COMPLETE
            );
          }
          setCurrentExecutionId(null);
          currentExecutingCellIdRef.current = null;
          // Handle "Run All" queue
          if (isRunningAll && runAllQueue.length > 0) {
            const nextCellId = runAllQueue[0];
            setRunAllQueue((prev) => prev.slice(1));
            setTimeout(() => handleRunCellInternal(nextCellId), 100);
          } else if (isRunningAll) {
            setIsRunningAll(false);
          }
          break;
        case "execution-cancelled":
          if (currentExecutingCellIdRef.current !== null) {
            updateCellExecutionState(
              currentExecutingCellIdRef.current,
              ExecutionState.CANCELLED
            );
          }
          setCurrentExecutionId(null);
          currentExecutingCellIdRef.current = null;
          setIsRunningAll(false);
          setRunAllQueue([]);
          break;
        case "error":
          if (currentExecutingCellIdRef.current !== null) {
            updateCellExecutionState(
              currentExecutingCellIdRef.current,
              ExecutionState.FAILED
            );
            addOutputLine(
              currentExecutingCellIdRef.current,
              "err",
              `Error: ${message.message || "Unknown error"}`
            );
          }
          setCurrentExecutionId(null);
          currentExecutingCellIdRef.current = null;
          setIsRunningAll(false);
          setRunAllQueue([]);
          break;
        default:
          console.warn("Unknown message type:", message);
      }
    };

    worker.onerror = (error) => {
      console.error("Worker error:", error);
      if (currentExecutingCellIdRef.current !== null) {
        addOutputLine(
          currentExecutingCellIdRef.current,
          "err",
          `Worker error: ${error.message}`
        );
        updateCellExecutionState(
          currentExecutingCellIdRef.current,
          ExecutionState.FAILED
        );
      }
      setCurrentExecutionId(null);
      currentExecutingCellIdRef.current = null;
      setIsRunningAll(false);
      setRunAllQueue([]);
    };

    // Initialize Pyodide
    worker.postMessage({ type: "init" });

    return () => {
      worker.terminate();
    };
  }, [sharedArrayBufferSupported]);

  // Internal function to run a specific cell
  const handleRunCellInternal = (cellId: number) => {
    const cell = cells.find((c) => c.id === cellId);
    if (
      !cell ||
      !isInitialized ||
      currentExecutingCellIdRef.current !== null ||
      !workerRef.current
    ) {
      return;
    }

    clearCellOutput(cellId);
    updateCellExecutionState(cellId, ExecutionState.RUNNING);

    const executionId = `exec_${executionIdRef.current++}`;
    setCurrentExecutionId(executionId);
    currentExecutingCellIdRef.current = cellId;

    workerRef.current.postMessage({
      type: "execute",
      code: cell.code,
      id: executionId,
    });
  };

  // Handle running a specific cell
  const handleRunCell = (cellId: number) => {
    if (isRunningAll) return;
    handleRunCellInternal(cellId);
  };

  // Handle stopping execution
  const handleStopExecution = () => {
    if (
      !currentExecutionId ||
      !workerRef.current ||
      currentExecutingCellIdRef.current === null ||
      !interruptBufferRef.current
    ) {
      return;
    }

    try {
      // Set interrupt signal (2 = SIGINT)
      interruptBufferRef.current[0] = 2;
    } catch (error) {
      console.error("Failed to use SharedArrayBuffer for cancellation:", error);
    }
  };

  // Handle running all cells
  const handleRunAll = () => {
    if (
      isRunningAll ||
      currentExecutingCellIdRef.current !== null ||
      cells.length === 0
    ) {
      return;
    }

    setIsRunningAll(true);
    const cellIds = cells.map((cell) => cell.id);
    const [firstCellId, ...restCellIds] = cellIds;
    setRunAllQueue(restCellIds);

    // Start with the first cell
    handleRunCellInternal(firstCellId);
  };

  // Handle code change for a specific cell
  const handleCodeChange = (cellId: number, newCode: string) => {
    setCells((prev) =>
      prev.map((cell) =>
        cell.id === cellId
          ? {
              ...cell,
              code: newCode,
              executionState:
                cell.executionState === ExecutionState.RUNNING
                  ? cell.executionState
                  : ExecutionState.NEW,
            }
          : cell
      )
    );
  };

  // Handle adding a new cell
  const handleAddCell = () => {
    const newCell: Cell = {
      id: nextCellId,
      code: "# New Python cell\n",
      output: [],
      executionState: ExecutionState.NEW,
    };
    setCells((prev) => [...prev, newCell]);
    setNextCellId((prev) => prev + 1);
  };

  // Handle deleting a cell
  const handleDeleteCell = (cellId: number) => {
    if (cells.length <= 1) return; // Don't delete the last cell

    // If deleting the currently executing cell, stop execution
    if (currentExecutingCellIdRef.current === cellId) {
      handleStopExecution();
    }

    setCells((prev) => prev.filter((cell) => cell.id !== cellId));
  };

  // Get cell output as string for AI functions
  const getCellOutputString = (cellId: number): string | undefined => {
    const cell = cells.find((c) => c.id === cellId);
    if (!cell || cell.output.length === 0) return undefined;

    // Filter out system messages and only show actual stdout/stderr
    const outputLines = cell.output.filter((line) => line.type !== "system");
    if (outputLines.length === 0) return undefined;

    return outputLines.map((line) => line.value).join("\n");
  };

  // Get all cells data for AI functions
  const getAllCellsData = (): CellData[] => {
    return cells.map((cell) => ({
      id: cell.id,
      type: "code" as const,
      text: cell.code,
      output: getCellOutputString(cell.id),
    }));
  };

  // Handle cell updates from AI functions
  const handleMultiCellUpdate = (cellId: number, newText: string) => {
    handleCodeChange(cellId, newText);
  };

  // Check if any cell is currently running
  const isAnyCellRunning =
    cells.some((cell) => cell.executionState === ExecutionState.RUNNING) ||
    currentExecutingCellIdRef.current !== null;

  return (
    <main className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-center">Jupyter Engine</h1>

      <div className="space-y-4">
        {/* AI Chat Interface */}
        <ChatInterface
          getCellsData={getAllCellsData}
          onMultiCellUpdate={handleMultiCellUpdate}
        />

        {/* SharedArrayBuffer Status */}
        {!sharedArrayBufferSupported && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong>Error:</strong> SharedArrayBuffer is not available.
            Execution cancellation will not work. This may be due to missing
            security headers or browser compatibility. Required headers:
            Cross-Origin-Embedder-Policy: require-corp,
            Cross-Origin-Opener-Policy: same-origin
          </div>
        )}

        {/* Control Buttons */}
        <div
          className="flex justify-center space-x-4"
          role="toolbar"
          aria-label="Notebook controls"
        >
          <button
            onClick={handleRunAll}
            disabled={!isInitialized || isAnyCellRunning || cells.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label={`Run all ${cells.length} cells sequentially`}
            aria-describedby="run-all-help"
          >
            <FaPlay className="w-4 h-4" />
            <span>Run All</span>
          </button>

          <button
            onClick={handleAddCell}
            className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            aria-label="Add new empty Python cell at the end"
            aria-describedby="add-cell-help"
          >
            <FaPlus className="w-4 h-4" />
            <span>Add Cell</span>
          </button>
        </div>

        {/* Screen reader help text */}
        <div className="sr-only">
          <div id="run-all-help">
            Executes all code cells in sequence from top to bottom. Disabled
            when any cell is currently running.
          </div>
          <div id="add-cell-help">
            Creates a new empty Python code cell at the end of the notebook.
          </div>
        </div>

        {/* Code Cells */}
        <div
          className="space-y-6"
          role="main"
          aria-label="Code cells"
          aria-live="polite"
          aria-atomic="false"
        >
          {cells.map((cell, index) => (
            <div
              key={cell.id}
              role="region"
              aria-label={`Code cell ${index + 1} of ${cells.length}`}
              aria-describedby={`cell-${cell.id}-status`}
            >
              <CodeCell
                code={cell.code}
                onChange={(newCode) => handleCodeChange(cell.id, newCode)}
                onRun={() => handleRunCell(cell.id)}
                onStop={handleStopExecution}
                onDelete={() => handleDeleteCell(cell.id)}
                executionState={cell.executionState}
                output={cell.output}
                disabled={
                  isAnyCellRunning &&
                  currentExecutingCellIdRef.current !== cell.id
                }
                isInitialized={isInitialized}
                canDelete={cells.length > 1}
              />
              {/* Screen reader status announcement */}
              <div id={`cell-${cell.id}-status`} className="sr-only">
                Cell {index + 1} status:{" "}
                {cell.executionState === ExecutionState.NEW
                  ? "Ready to run"
                  : cell.executionState === ExecutionState.RUNNING
                  ? "Currently running"
                  : cell.executionState === ExecutionState.COMPLETE
                  ? "Execution completed"
                  : cell.executionState === ExecutionState.FAILED
                  ? "Execution failed"
                  : "Execution cancelled"}
              </div>
            </div>
          ))}
        </div>

        {/* Status */}
        <div className="text-center text-sm text-gray-600">
          Status:{" "}
          {isInitialized
            ? isAnyCellRunning
              ? isRunningAll
                ? "Running all cells..."
                : "Running code..."
              : "Ready"
            : "Initializing..."}
          {sharedArrayBufferSupported && (
            <span className="text-green-600 ml-2">
              • SharedArrayBuffer enabled
            </span>
          )}
          {!sharedArrayBufferSupported && (
            <span className="text-red-600 ml-2">
              • SharedArrayBuffer disabled
            </span>
          )}
        </div>
      </div>
    </main>
  );
}
