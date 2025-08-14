/// <reference lib="webworker" />

// Load Pyodide from CDN (v0.28.0)
// Note: We intentionally avoid naming any function `loadPyodide` to prevent shadowing the global provided by Pyodide.
importScripts('https://cdn.jsdelivr.net/pyodide/v0.28.0/full/pyodide.js');

type RunMessage = {
  type: 'run';
  code: string;
};

type InitMessage = {
  type: 'init';
};

type SetInterruptBufferMessage = {
  type: 'setInterruptBuffer';
  sab: SharedArrayBuffer;
};

type IncomingMessage = RunMessage | InitMessage | SetInterruptBufferMessage;

interface PyodideApi {
  runPythonAsync: (code: string) => Promise<unknown>;
  setStdout?: (opts: { batched: (chunk: string) => void }) => void;
  setStderr?: (opts: { batched: (chunk: string) => void }) => void;
  setInterruptBuffer?: (buffer: Uint8Array) => void;
}

type ExtendedWorkerScope = DedicatedWorkerGlobalScope & {
  loadPyodide: (options: { indexURL: string }) => Promise<PyodideApi>;
};

const workerScope = self as unknown as ExtendedWorkerScope;

let pyodideInstance: PyodideApi | null = null;
let isLoading = false;
let loadingPromise: Promise<void> | null = null;
let interruptBuffer: Uint8Array | null = null;

async function ensurePyodideLoaded(): Promise<void> {
  if (pyodideInstance) return;
  if (loadingPromise) {
    await loadingPromise;
    return;
  }
  loadingPromise = (async () => {
    if (pyodideInstance) return;
    isLoading = true;
    pyodideInstance = await workerScope.loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.28.0/full/',
    });
    // Wire stdout/stderr streaming to the worker
    if (pyodideInstance && typeof pyodideInstance.setStdout === 'function') {
      pyodideInstance.setStdout({
        batched: (s: string) => {
          workerScope.postMessage({ type: 'out', value: s });
        },
      });
    }
    if (pyodideInstance && typeof pyodideInstance.setStderr === 'function') {
      pyodideInstance.setStderr({
        batched: (s: string) => {
          workerScope.postMessage({ type: 'err', value: s });
        },
      });
    }
    // If interrupt buffer was configured before Pyodide loaded, apply it now
    if (
      pyodideInstance &&
      interruptBuffer &&
      typeof pyodideInstance.setInterruptBuffer === 'function'
    ) {
      pyodideInstance.setInterruptBuffer(interruptBuffer);
    }
    isLoading = false;
    workerScope.postMessage({ type: 'ready' });
  })();
  try {
    await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}

workerScope.addEventListener('message', async (event: MessageEvent<IncomingMessage>) => {
  const msg = event.data;
  try {
    if (msg.type === 'init') {
      await ensurePyodideLoaded();
      return;
    }
    if (msg.type === 'setInterruptBuffer') {
      // Configure the interrupt buffer for immediate cancellation support
      interruptBuffer = new Uint8Array(msg.sab);
      await ensurePyodideLoaded();
      if (pyodideInstance && typeof pyodideInstance.setInterruptBuffer === 'function') {
        pyodideInstance.setInterruptBuffer(interruptBuffer);
      }
      return;
    }
    if (msg.type === 'run') {
      await ensurePyodideLoaded();
      try {
        if (!pyodideInstance) throw new Error('Pyodide not loaded');
        const result = await pyodideInstance.runPythonAsync(msg.code);
        workerScope.postMessage({ type: 'result', value: String(result ?? '') });
      } catch (err: unknown) {
        const raw = String(err);
        const msgFromError = (err as Error)?.message;
        const message = msgFromError && msgFromError.trim() !== '' ? msgFromError : raw;
        // Map KeyboardInterrupt to a dedicated cancellation message (check both message and raw)
        if (
          message.toLowerCase().includes('keyboardinterrupt') ||
          raw.toLowerCase().includes('keyboardinterrupt')
        ) {
          workerScope.postMessage({ type: 'execution-cancelled' });
        } else {
          workerScope.postMessage({ type: 'error', value: message });
        }
      } finally {
        workerScope.postMessage({ type: 'done' });
      }
    }
  } catch (e) {
    workerScope.postMessage({ type: 'error', value: (e as Error)?.message ?? String(e) });
  }
});
