"use client";

import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";

interface PyodideWorkerMessage {
  type: string;
  stdout?: string;
  stderr?: string;
  message?: string;
  id?: string;
}

export default function Home() {
  const [code, setCode] = useState(
    'print("Hello, World!")\nprint("Ready to run Python code!")'
  );
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const executionIdRef = useRef(0);

  // Initialize the web worker
  useEffect(() => {
    const worker = new Worker(new URL("./pyodide-worker.ts", import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<PyodideWorkerMessage>) => {
      const { type, stdout, stderr, message } = event.data;

      switch (type) {
        case "init-complete":
          setIsInitialized(true);
          setOutput(
            "Pyodide initialized successfully. Ready to run Python code!"
          );
          break;
        case "result":
          setIsRunning(false);
          const outputText = [];
          if (stdout) outputText.push(stdout);
          if (stderr) outputText.push(`Error: ${stderr}`);
          setOutput(
            outputText.join("\n") || "Code executed successfully (no output)"
          );
          break;
        case "error":
          setIsRunning(false);
          setOutput(`Error: ${message}`);
          break;
        default:
          console.warn("Unknown message type:", type);
      }
    };

    worker.onerror = (error) => {
      console.error("Worker error:", error);
      setOutput(`Worker error: ${error.message}`);
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
    setOutput("Running...");

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

        {/* Run Button */}
        <div className="flex justify-center">
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
        </div>

        {/* Output Section */}
        <div className="border rounded-lg">
          <div className="bg-gray-100 px-4 py-2 border-b">
            <h2 className="text-lg font-semibold">Output</h2>
          </div>
          <div className="p-4">
            <pre className="bg-black text-green-400 p-4 rounded font-mono text-sm overflow-auto max-h-64">
              {output ||
                (isInitialized
                  ? "No output yet. Run some Python code!"
                  : "Initializing Pyodide...")}
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
