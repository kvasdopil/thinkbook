"use client";

import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import type { WorkerResponseMessage } from "../types/worker-messages";

interface OutputLine {
  type: "out" | "err" | "system";
  value: string;
  timestamp: number;
}

export default function Home() {
  const [code, setCode] = useState(
    `import time

for i in range(5):
    time.sleep(1)
    print(f"Hello {i}")
    
print("All done!")`
  );
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(
    null
  );
  const [sharedArrayBufferSupported, setSharedArrayBufferSupported] =
    useState(false);
  const workerRef = useRef<Worker | null>(null);
  const interruptBufferRef = useRef<Uint8Array | null>(null);
  const executionIdRef = useRef(0);
  const outputRef = useRef<HTMLPreElement>(null);

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

  // Auto-scroll to bottom if user is already at bottom
  const scrollToBottomIfAtBottom = () => {
    if (outputRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = outputRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px tolerance

      if (isAtBottom) {
        outputRef.current.scrollTop = scrollHeight;
      }
    }
  };

  // Add a new output line
  const addOutputLine = (type: "out" | "err" | "system", value: string) => {
    setOutput((prev) => [
      ...prev,
      {
        type,
        value,
        timestamp: Date.now(),
      },
    ]);

    // Auto-scroll after state update
    setTimeout(scrollToBottomIfAtBottom, 0);
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
          if (sharedArrayBufferSupported) {
            // Create and share interrupt buffer
            try {
              const buffer = new Uint8Array(new SharedArrayBuffer(1));
              interruptBufferRef.current = buffer;
              worker.postMessage({
                type: "setInterruptBuffer",
                interruptBuffer: buffer,
              });
              addOutputLine(
                "system",
                "Pyodide initialized successfully with SharedArrayBuffer cancellation support. Ready to run Python code!"
              );
            } catch (error) {
              addOutputLine(
                "err",
                "Failed to create SharedArrayBuffer. Cancellation will not work."
              );
              console.error("Failed to create SharedArrayBuffer:", error);
            }
          } else {
            addOutputLine(
              "err",
              "SharedArrayBuffer not available. Cancellation will not work."
            );
          }
          break;
        case "out":
          if (message.value) {
            addOutputLine("out", message.value);
          }
          break;
        case "err":
          if (message.value) {
            addOutputLine("err", message.value);
          }
          break;
        case "execution-complete":
          setIsRunning(false);
          setIsStopping(false);
          setCurrentExecutionId(null);
          addOutputLine("system", "Execution completed.");
          break;
        case "execution-cancelled":
          setIsRunning(false);
          setIsStopping(false);
          setCurrentExecutionId(null);
          addOutputLine("system", "Execution cancelled.");
          break;
        case "error":
          setIsRunning(false);
          setIsStopping(false);
          setCurrentExecutionId(null);
          addOutputLine("err", `Error: ${message.message || "Unknown error"}`);
          break;
        default:
          console.warn("Unknown message type:", message);
      }
    };

    worker.onerror = (error) => {
      console.error("Worker error:", error);
      addOutputLine("err", `Worker error: ${error.message}`);
      setIsRunning(false);
      setIsStopping(false);
      setCurrentExecutionId(null);
    };

    // Initialize Pyodide
    worker.postMessage({ type: "init" });

    return () => {
      worker.terminate();
    };
  }, [sharedArrayBufferSupported]);

  const handleRunCode = () => {
    if (!isInitialized || isRunning || isStopping || !workerRef.current) {
      return;
    }

    setIsRunning(true);
    setIsStopping(false);
    addOutputLine("system", "Running...");

    const executionId = `exec_${executionIdRef.current++}`;
    setCurrentExecutionId(executionId);
    workerRef.current.postMessage({
      type: "execute",
      code,
      id: executionId,
    });
  };

  const handleStopCode = () => {
    if (
      !currentExecutionId ||
      !workerRef.current ||
      isStopping ||
      !interruptBufferRef.current
    ) {
      return;
    }

    setIsStopping(true);
    addOutputLine("system", "Stopping execution...");

    try {
      // Set interrupt signal (2 = SIGINT)
      interruptBufferRef.current[0] = 2;
      console.log("Interrupt signal sent via SharedArrayBuffer");
    } catch (error) {
      console.error("Failed to use SharedArrayBuffer for cancellation:", error);
      addOutputLine("err", "Failed to cancel execution");
      setIsStopping(false);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    setCode(value || "");
  };

  const clearOutput = () => {
    setOutput([]);
  };

  const formatOutput = (lines: OutputLine[]) => {
    return lines.map((line, index) => {
      let className = "";
      switch (line.type) {
        case "out":
          className = "text-green-400";
          break;
        case "err":
          className = "text-red-400";
          break;
        case "system":
          className = "text-blue-400";
          break;
        default:
          className = "text-green-400";
      }

      return (
        <span key={index} className={className}>
          {line.value}
        </span>
      );
    });
  };

  return (
    <main className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-center">Jupyter Engine</h1>

      <div className="space-y-4">
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

        {/* Editor Section */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-100 px-4 py-2 border-b">
            <h2 className="text-lg font-semibold">Python Code Editor</h2>
          </div>
          <div className="h-64">
            <Editor
              height="100%"
              defaultLanguage="python"
              value={code}
              onChange={handleEditorChange}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                insertSpaces: true,
              }}
            />
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex justify-center gap-4">
          {!isRunning && !isStopping ? (
            <button
              onClick={handleRunCode}
              disabled={!isInitialized}
              className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
                !isInitialized
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
              }`}
            >
              Run Code
            </button>
          ) : (
            <button
              onClick={handleStopCode}
              disabled={isStopping || !interruptBufferRef.current}
              className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
                isStopping || !interruptBufferRef.current
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700 active:bg-red-800"
              }`}
            >
              {isStopping ? "Stopping..." : "Stop"}
            </button>
          )}
          <button
            onClick={clearOutput}
            className="px-6 py-3 rounded-lg font-semibold text-white bg-gray-600 hover:bg-gray-700 active:bg-gray-800 transition-colors"
          >
            Clear Output
          </button>
        </div>

        {/* Output Section */}
        <div className="border rounded-lg">
          <div className="bg-gray-100 px-4 py-2 border-b">
            <h2 className="text-lg font-semibold">Output</h2>
          </div>
          <div className="p-4">
            <pre
              ref={outputRef}
              className="bg-black text-green-400 p-4 rounded font-mono text-sm overflow-auto max-h-64 whitespace-pre-wrap"
            >
              {output.length > 0
                ? formatOutput(output)
                : isInitialized
                ? "No output yet. Run some Python code!"
                : "Initializing Pyodide..."}
            </pre>
          </div>
        </div>

        {/* Status */}
        <div className="text-center text-sm text-gray-600">
          Status:{" "}
          {isInitialized
            ? isStopping
              ? "Stopping execution..."
              : isRunning
              ? "Running code..."
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
