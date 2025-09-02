/// <reference lib="webworker" />

import type { WorkerMessage, WorkerResponse } from '../types/worker';

declare const self: DedicatedWorkerGlobalScope;

interface PyodideInterface {
  runPython: (code: string) => unknown;
  setInterruptBuffer: (buffer: Uint8Array) => void;
  globals: {
    set: (name: string, value: unknown) => void;
    get: (name: string) => unknown;
  };
}

// Global type for Pyodide
declare global {
  function loadPyodide(options?: {
    indexURL?: string;
    stdout?: (text: string) => void;
    stderr?: (text: string) => void;
  }): Promise<PyodideInterface>;
}

let pyodide: PyodideInterface | null = null;
let isInitialized = false;
let initPromise: Promise<void> | null = null;
let interruptBuffer: Uint8Array | null = null;

// Initialize Pyodide
async function initializePyodide(): Promise<void> {
  if (initPromise) {
    console.log(
      '[PyodideWorker] Already initializing, returning existing promise',
    );
    return initPromise;
  }

  console.log('[PyodideWorker] Starting Pyodide initialization');

  initPromise = (async () => {
    try {
      console.log('[PyodideWorker] Loading Pyodide script from CDN...');

      // Add timeout for script loading
      const scriptLoadTimeout = setTimeout(() => {
        throw new Error('Timeout loading Pyodide script (30s)');
      }, 30000);

      // Load Pyodide dynamically using fetch and eval for ES module compatibility
      const response = await fetch(
        'https://cdn.jsdelivr.net/pyodide/v0.28.0/full/pyodide.js',
      );
      const pyodideScript = await response.text();

      // Execute the script in worker context
      eval(pyodideScript);
      clearTimeout(scriptLoadTimeout);

      console.log('[PyodideWorker] Pyodide script loaded, initializing...');

      // Add timeout for Pyodide initialization
      const initTimeout = setTimeout(() => {
        throw new Error('Timeout initializing Pyodide (60s)');
      }, 60000);

      // loadPyodide is now available in global scope
      pyodide = await (
        globalThis as typeof globalThis & { loadPyodide: typeof loadPyodide }
      ).loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.28.0/full/',
        stdout: (text: string) => {
          console.log('[PyodideWorker] Python stdout:', text);
          // Get the current execution context ID
          const messageId =
            (globalThis as typeof globalThis & { currentMessageId?: string })
              .currentMessageId || 'init';
          // Send stdout to main thread with correct message ID
          self.postMessage({
            type: 'output',
            id: messageId,
            content: text,
          } as WorkerResponse);
        },
        stderr: (text: string) => {
          console.error('[PyodideWorker] Python stderr:', text);
          // Get the current execution context ID
          const messageId =
            (globalThis as typeof globalThis & { currentMessageId?: string })
              .currentMessageId || 'init';
          // Send stderr to main thread with correct message ID
          self.postMessage({
            type: 'error',
            id: messageId,
            error: text,
          } as WorkerResponse);
        },
      });

      clearTimeout(initTimeout);

      console.log('[PyodideWorker] Pyodide initialized successfully');
      isInitialized = true;

      // Set interrupt buffer if it was already provided
      if (interruptBuffer && pyodide) {
        pyodide.setInterruptBuffer(interruptBuffer);
        console.log(
          '[PyodideWorker] Interrupt buffer set during initialization',
        );
      }

      // Test basic functionality
      try {
        const testResult = pyodide?.runPython(
          'print("Pyodide initialization test successful")',
        );
        console.log('[PyodideWorker] Initialization test result:', testResult);
      } catch (testError) {
        console.warn('[PyodideWorker] Initialization test failed:', testError);
      }

      // Signal that worker is ready
      console.log('[PyodideWorker] Sending ready message to main thread');
      self.postMessage({
        type: 'ready',
        id: 'init',
      } as WorkerResponse);
    } catch (error) {
      console.error('[PyodideWorker] Initialization failed:', error);
      self.postMessage({
        type: 'error',
        id: 'init',
        error: `Failed to initialize Pyodide: ${error instanceof Error ? error.message : String(error)}`,
      } as WorkerResponse);
      // Reset the promise so we can try again
      initPromise = null;
    }
  })();

  return initPromise;
}

// Execute Python code with streaming output
async function executeCode(code: string, messageId: string): Promise<void> {
  console.log(`[PyodideWorker] Executing code for message ${messageId}:`, code);

  if (!pyodide || !isInitialized) {
    console.error('[PyodideWorker] Cannot execute - Pyodide not initialized');
    self.postMessage({
      type: 'error',
      id: messageId,
      error: 'Pyodide is not initialized',
    } as WorkerResponse);
    return;
  }

  try {
    // Set the current message ID for output routing
    (
      globalThis as typeof globalThis & { currentMessageId: string }
    ).currentMessageId = messageId;

    // Set interrupt buffer if available
    if (interruptBuffer && pyodide) {
      pyodide.setInterruptBuffer(interruptBuffer);
      console.log(
        `[PyodideWorker] Interrupt buffer set for execution ${messageId}`,
      );
    }

    console.log(
      `[PyodideWorker] Setting up streaming output for message ${messageId}`,
    );

    // Set up JavaScript callbacks for streaming output
    const streamOut = (text: string) => {
      self.postMessage({
        type: 'out',
        id: messageId,
        value: text,
      } as WorkerResponse);
    };

    const streamErr = (text: string) => {
      self.postMessage({
        type: 'err',
        id: messageId,
        value: text,
      } as WorkerResponse);
    };

    // Make streaming functions available to Python
    pyodide.globals.set('_stream_out', streamOut);
    pyodide.globals.set('_stream_err', streamErr);

    // Override Python print() and sys.stderr with streaming versions
    const streamingSetup = `
import sys
import builtins

# Store original functions
_original_print = builtins.print
_original_stderr_write = sys.stderr.write

# Define streaming print function
def _streaming_print(*args, **kwargs):
    # Extract all arguments and construct the output
    sep = kwargs.get('sep', ' ')
    end = kwargs.get('end', '\\n')
    file = kwargs.get('file', sys.stdout)
    
    # Convert args to strings and join with separator
    output = sep.join(str(arg) for arg in args) + end
    
    # Route to appropriate stream
    if file == sys.stderr:
        _stream_err(output)
    else:
        _stream_out(output)

# Define streaming stderr write function
def _streaming_stderr_write(text):
    _stream_err(text)
    return len(text)  # Return number of characters written

# Override built-in functions
builtins.print = _streaming_print
sys.stderr.write = _streaming_stderr_write
`;

    // Set up streaming for this execution
    pyodide.runPython(streamingSetup);

    console.log(`[PyodideWorker] Running Python code for message ${messageId}`);

    // Execute the user code
    const result = pyodide.runPython(code);

    console.log(
      `[PyodideWorker] Code execution result for ${messageId}:`,
      result,
    );

    // If the result is not None or undefined, send it as output
    if (
      result !== undefined &&
      result !== null &&
      result !== pyodide.runPython('None')
    ) {
      console.log(`[PyodideWorker] Sending result output for ${messageId}`);
      self.postMessage({
        type: 'out',
        id: messageId,
        value: String(result) + '\n',
      } as WorkerResponse);
    }

    // Restore original functions
    const cleanup = `
builtins.print = _original_print
sys.stderr.write = _original_stderr_write
del _streaming_print, _streaming_stderr_write, _original_print, _original_stderr_write
`;
    pyodide.runPython(cleanup);

    // Signal completion
    console.log(`[PyodideWorker] Execution completed for ${messageId}`);
    self.postMessage({
      type: 'complete',
      id: messageId,
    } as WorkerResponse);
  } catch (error) {
    console.error(`[PyodideWorker] Execution error for ${messageId}:`, error);

    // Try to restore original functions in case of error
    try {
      pyodide?.runPython(`
try:
    builtins.print = _original_print
    sys.stderr.write = _original_stderr_write
except:
    pass
`);
    } catch {
      // Ignore cleanup errors
    }

    // Check if it's a KeyboardInterrupt from cancellation
    const errorString = String(error);
    if (errorString.includes('KeyboardInterrupt')) {
      console.log(`[PyodideWorker] Execution cancelled for ${messageId}`);
      self.postMessage({
        type: 'cancelled',
        id: messageId,
      } as WorkerResponse);
      return;
    }

    self.postMessage({
      type: 'error',
      id: messageId,
      error: errorString,
    } as WorkerResponse);
  }
}

// Handle messages from main thread
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const { type, id, code } = event.data;
  console.log(`[PyodideWorker] Received message: ${type} (id: ${id})`);

  switch (type) {
    case 'init':
      console.log('[PyodideWorker] Received init message');
      await initializePyodide();
      break;

    case 'execute':
      console.log('[PyodideWorker] Received execute message');
      if (code) {
        await executeCode(code, id);
      } else {
        console.error('[PyodideWorker] Execute message missing code');
        self.postMessage({
          type: 'error',
          id,
          error: 'No code provided for execution',
        } as WorkerResponse);
      }
      break;

    case 'setInterruptBuffer':
      console.log('[PyodideWorker] Received setInterruptBuffer message');
      if (event.data.buffer) {
        interruptBuffer = new Uint8Array(event.data.buffer);
        if (pyodide && isInitialized) {
          pyodide.setInterruptBuffer(interruptBuffer);
          console.log('[PyodideWorker] Interrupt buffer set');
        } else {
          console.log(
            '[PyodideWorker] Interrupt buffer stored, will set when Pyodide is ready',
          );
        }
      } else {
        console.error(
          '[PyodideWorker] setInterruptBuffer message missing buffer',
        );
      }
      break;

    case 'interrupt':
      console.log(
        '[PyodideWorker] Received interrupt message - legacy fallback',
      );
      // This is now a legacy fallback - SharedArrayBuffer should be used instead
      self.postMessage({
        type: 'error',
        id,
        error: 'Execution interrupted (legacy)',
      } as WorkerResponse);
      break;

    default:
      console.error(`[PyodideWorker] Unknown message type: ${type}`);
      self.postMessage({
        type: 'error',
        id,
        error: `Unknown message type: ${type}`,
      } as WorkerResponse);
  }
});

// Auto-initialize on worker start
console.log('[PyodideWorker] Worker starting, auto-initializing Pyodide');
initializePyodide().catch((error) => {
  console.error('[PyodideWorker] Auto-initialization failed:', error);
});
