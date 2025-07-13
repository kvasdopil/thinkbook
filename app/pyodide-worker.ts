// pyodide-worker.ts
/// <reference lib="webworker" />

import type {
  WorkerInputMessage,
  WorkerResponseMessage,
} from "../types/worker-messages";

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

// Execute Python code with streaming output
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
    // Set up JavaScript callback for streaming output
    pyodide.globals.set("send_output", (output_type: string, text: string) => {
      ctx.postMessage({
        type: output_type,
        value: text,
        id,
      } as WorkerResponseMessage);
    });

    // Set up streaming output capture by redefining print
    pyodide.runPython(`
import sys
import builtins

# Save original print function
original_print = builtins.print

def streaming_print(*args, **kwargs):
    # Convert print arguments to string like normal print
    import io
    buffer = io.StringIO()
    
    # Extract file parameter to avoid conflict
    kwargs_copy = kwargs.copy()
    kwargs_copy['file'] = buffer
    
    original_print(*args, **kwargs_copy)
    output = buffer.getvalue()
    
    # Send output to main thread
    send_output("out", output)

# Replace print with streaming version
builtins.print = streaming_print

# Set up stderr capture
class StderrCapture:
    def write(self, text):
        if text.strip():
            send_output("err", text)
        return len(text)
    
    def flush(self):
        pass

# Replace stderr
original_stderr = sys.stderr
sys.stderr = StderrCapture()
`);

    // Store the user code in pyodide globals to avoid template literal issues
    pyodide.globals.set("user_code", code);

    // Execute the user code
    pyodide.runPython(`
try:
    exec(user_code, globals())
except Exception as e:
    import traceback
    error_msg = traceback.format_exc()
    send_output("err", error_msg)
finally:
    # Restore original functions
    builtins.print = original_print
    sys.stderr = original_stderr
`);

    // Send completion message
    ctx.postMessage({
      type: "execution-complete",
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
ctx.onmessage = async (event: MessageEvent<WorkerInputMessage>) => {
  const message: WorkerInputMessage = event.data;
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
