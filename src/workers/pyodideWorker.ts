/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope;

interface PyodideInterface {
  runPython: (code: string) => unknown;
  globals: {
    set: (name: string, value: unknown) => void;
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

interface WorkerMessage {
  type: 'init' | 'execute' | 'interrupt';
  id: string;
  code?: string;
}

interface WorkerResponse {
  type: 'ready' | 'output' | 'error' | 'complete';
  id: string;
  content?: string;
  error?: string;
}

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

// Execute Python code
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

    console.log(`[PyodideWorker] Running Python code for message ${messageId}`);

    // Execute the code
    const result = pyodide.runPython(code);

    console.log(
      `[PyodideWorker] Code execution result for ${messageId}:`,
      result,
    );

    // If the result is not None or undefined, print it
    if (
      result !== undefined &&
      result !== null &&
      result !== pyodide.runPython('None')
    ) {
      console.log(`[PyodideWorker] Sending result output for ${messageId}`);
      self.postMessage({
        type: 'output',
        id: messageId,
        content: String(result),
      } as WorkerResponse);
    }

    // Signal completion
    console.log(`[PyodideWorker] Execution completed for ${messageId}`);
    self.postMessage({
      type: 'complete',
      id: messageId,
    } as WorkerResponse);
  } catch (error) {
    console.error(`[PyodideWorker] Execution error for ${messageId}:`, error);
    self.postMessage({
      type: 'error',
      id: messageId,
      error: String(error),
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

    case 'interrupt':
      console.log('[PyodideWorker] Received interrupt message');
      // Pyodide doesn't support interruption, but we can signal error
      self.postMessage({
        type: 'error',
        id,
        error: 'Execution interrupted',
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
