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
  const [isInitialized, setIsInitialized] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const executionIdRef = useRef(0);
  const outputRef = useRef<HTMLPreElement>(null);

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
          addOutputLine(
            "system",
            "Pyodide initialized successfully. Ready to run Python code!"
          );
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
          addOutputLine("system", "Execution completed.");
          break;
        case "error":
          setIsRunning(false);
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
    };

    // Initialize Pyodide
    worker.postMessage({ type: "init" });

    return () => {
      worker.terminate();
    };
  }, []);

  const handleRunCode = () => {
    if (!isInitialized || isRunning || !workerRef.current) {
      return;
    }

    setIsRunning(true);
    addOutputLine("system", "Running...");

    const executionId = `exec_${executionIdRef.current++}`;
    workerRef.current.postMessage({
      type: "execute",
      code,
      id: executionId,
    });
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
          <button
            onClick={handleRunCode}
            disabled={!isInitialized || isRunning}
            className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
              !isInitialized || isRunning
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
            }`}
          >
            {isRunning ? "Running..." : "Run Code"}
          </button>
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
            ? isRunning
              ? "Running code..."
              : "Ready"
            : "Initializing..."}
        </div>
      </div>
    </main>
  );
}
