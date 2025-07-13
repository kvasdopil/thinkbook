// pyodide-worker.ts
/// <reference lib="webworker" />
const ctx: DedicatedWorkerGlobalScope =
  self as unknown as DedicatedWorkerGlobalScope;

interface PyodideInterface {
  loadPackage: (packages: string[]) => Promise<void>;
  runPython: (code: string) => unknown;
  loadPackagesFromImports: (code: string) => Promise<void>;
  globals: {
    set: (name: string, value: unknown) => void;
    get: (name: string) => unknown;
  };
}

let pyodide: PyodideInterface | null = null;

// Message types
interface ExecuteMessage {
  type: "execute";
  code: string;
  id: string;
}

interface InitMessage {
  type: "init";
}

type WorkerMessage = ExecuteMessage | InitMessage;

// Load Pyodide
async function loadPyodideWorker(): Promise<PyodideInterface> {
  // Import Pyodide from CDN
  console.log("initializing pyodide");
  importScripts("https://cdn.jsdelivr.net/npm/pyodide@0.28.0/pyodide.min.js");

  console.log("imported pyodide");
  // @ts-expect-error - pyodide is loaded via importScripts
  const pyodideInstance = await loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.28.0/full/",
  });

  console.log("pyodide initialized");
  return pyodideInstance;
}

// Initialize Pyodide
async function initializePyodide() {
  try {
    pyodide = await loadPyodideWorker();
    ctx.postMessage({ type: "init-complete" });
  } catch (error) {
    ctx.postMessage({
      type: "error",
      message: `Failed to initialize Pyodide: ${error}`,
    });
  }
}

// Execute Python code
async function executePython(code: string, id: string) {
  if (!pyodide) {
    ctx.postMessage({
      type: "error",
      message: "Pyodide not initialized",
      id,
    });
    return;
  }

  try {
    // Set up Python stdout/stderr capture (only once, reuse buffers)
    pyodide.runPython(`
import sys
import io
from contextlib import redirect_stdout, redirect_stderr

# Create string buffers for stdout and stderr
stdout_buffer = io.StringIO()
stderr_buffer = io.StringIO()
`);

    // Store the user code in pyodide globals to avoid template literal issues
    pyodide.globals.set("user_code", code);

    // Execute the user code with output capture
    pyodide.runPython(`
with redirect_stdout(stdout_buffer), redirect_stderr(stderr_buffer):
    exec(user_code, globals())
`);

    // Get captured output
    const stdoutOutput = pyodide.runPython("stdout_buffer.getvalue()");
    const stderrOutput = pyodide.runPython("stderr_buffer.getvalue()");

    ctx.postMessage({
      type: "result",
      stdout: stdoutOutput,
      stderr: stderrOutput,
      id,
    });
  } catch (error) {
    ctx.postMessage({
      type: "error",
      message: `Python execution error: ${error}`,
      id,
    });
  }
}

// Handle messages from main thread
ctx.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message: WorkerMessage = event.data;
  console.log("message", message);
  switch (message.type) {
    case "init":
      await initializePyodide();
      break;
    case "execute":
      await executePython(message.code, message.id);
      break;
    default:
      ctx.postMessage({
        type: "error",
        message: `Unknown message type: ${(message as { type: string }).type}`,
      });
  }
};

// Export empty object for TypeScript
export {};
