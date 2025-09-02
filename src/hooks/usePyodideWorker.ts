import { useRef, useEffect, useCallback, useState } from 'react';
import type {
  WorkerMessage,
  WorkerResponse,
  ExecutionResult,
} from '../types/worker';

interface UsePyodideWorkerOptions {
  onOutputChange?: (output: string[], error: string | null) => void;
}

export function usePyodideWorker({
  onOutputChange,
}: UsePyodideWorkerOptions = {}) {
  const workerRef = useRef<Worker | null>(null);
  const isInitializedRef = useRef(false);
  const messageHandlersRef = useRef<
    Map<string, (response: WorkerResponse) => void>
  >(new Map());
  const [isReady, setIsReady] = useState(false);
  const [executionState, setExecutionState] = useState<
    'idle' | 'running' | 'stopping' | 'cancelled' | 'complete' | 'failed'
  >('idle');
  const [initError, setInitError] = useState<string | null>(null);
  const [sharedBuffer, setSharedBuffer] = useState<SharedArrayBuffer | null>(
    null,
  );
  const [supportsSharedArrayBuffer, setSupportsSharedArrayBuffer] = useState<
    boolean | null
  >(null);
  const sharedBufferRef = useRef<SharedArrayBuffer | null>(null);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use refs for callbacks to avoid worker recreation on callback changes
  const onOutputChangeRef = useRef(onOutputChange);
  onOutputChangeRef.current = onOutputChange;

  // Initialize worker - this should only happen once
  useEffect(() => {
    if (workerRef.current || isInitializedRef.current) {
      console.log(
        '[usePyodideWorker] Worker already exists, skipping initialization',
      );
      return;
    }

    console.log('[usePyodideWorker] Initializing Pyodide worker');
    setInitError(null);

    // Check SharedArrayBuffer support
    const detectSharedArrayBufferSupport = () => {
      try {
        new SharedArrayBuffer(1);
        return true;
      } catch {
        return false;
      }
    };

    const hasSharedArrayBuffer = detectSharedArrayBufferSupport();
    setSupportsSharedArrayBuffer(hasSharedArrayBuffer);

    if (hasSharedArrayBuffer) {
      console.log('[usePyodideWorker] SharedArrayBuffer is supported');
      const buffer = new SharedArrayBuffer(1);
      setSharedBuffer(buffer);
      sharedBufferRef.current = buffer;
    } else {
      console.warn(
        '[usePyodideWorker] SharedArrayBuffer is not supported - immediate cancellation unavailable',
      );
    }

    try {
      // Set timeout for worker initialization
      initTimeoutRef.current = setTimeout(() => {
        console.error(
          '[usePyodideWorker] Worker initialization timeout (120s)',
        );
        setInitError(
          'Worker initialization timed out. Please check your network connection.',
        );
        if (workerRef.current) {
          workerRef.current.terminate();
          workerRef.current = null;
          isInitializedRef.current = false;
        }
      }, 120000); // 2 minutes timeout

      // Create the worker using Vite's worker bundling
      console.log('[usePyodideWorker] Creating worker with URL');
      const worker = new Worker(
        new URL('../workers/pyodideWorker.ts', import.meta.url),
        { type: 'module' },
      );

      console.log('[usePyodideWorker] Worker created successfully');
      workerRef.current = worker;
      isInitializedRef.current = true;

      // Handle messages from worker
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const { type, id, error } = event.data;
        console.log(`[usePyodideWorker] Received message: ${type} (id: ${id})`);

        // Handle global ready message
        if (type === 'ready' && id === 'init') {
          console.log('[usePyodideWorker] Worker is ready!');
          if (initTimeoutRef.current) {
            clearTimeout(initTimeoutRef.current);
            initTimeoutRef.current = null;
          }
          setIsReady(true);
          setInitError(null);

          // Send SharedArrayBuffer to worker if available
          if (hasSharedArrayBuffer && sharedBufferRef.current) {
            console.log(
              '[usePyodideWorker] Sending interrupt buffer to worker',
            );
            worker.postMessage({
              type: 'setInterruptBuffer',
              id: 'interrupt-buffer',
              buffer: sharedBufferRef.current,
            } as WorkerMessage);
          }

          return;
        }

        // Handle initialization output (ignore, but not actual init errors)
        if (type === 'output' && id === 'init') {
          // Ignore initialization output messages from Pyodide startup test
          return;
        }

        // Handle initialization errors
        if (type === 'error' && id === 'init') {
          console.error(
            '[usePyodideWorker] Worker initialization error:',
            error,
          );
          if (initTimeoutRef.current) {
            clearTimeout(initTimeoutRef.current);
            initTimeoutRef.current = null;
          }
          setInitError(error || 'Unknown initialization error');
          setIsReady(false);
          return;
        }

        // Route message to specific handler
        const handler = messageHandlersRef.current.get(id);
        if (handler) {
          handler(event.data);
        } else {
          console.warn(
            `[usePyodideWorker] No handler found for message id: ${id}`,
          );
        }
      };

      worker.onerror = (error) => {
        console.error('[usePyodideWorker] Worker error:', error);
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
          initTimeoutRef.current = null;
        }
        setInitError(`Worker error: ${error.message || 'Unknown error'}`);
        setIsReady(false);
      };

      worker.onmessageerror = (error) => {
        console.error('[usePyodideWorker] Worker message error:', error);
        setInitError(
          `Worker message error: ${error.type || 'Unknown message error'}`,
        );
      };

      // Initialize the worker
      console.log('[usePyodideWorker] Sending init message to worker');
      worker.postMessage({ type: 'init', id: 'init' } as WorkerMessage);
    } catch (error) {
      console.error('[usePyodideWorker] Failed to create worker:', error);
      setInitError(
        `Failed to create worker: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      console.log('[usePyodideWorker] Cleaning up worker');
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
      }
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      isInitializedRef.current = false;
      setIsReady(false);
      setInitError(null);
    };
  }, []); // Empty dependency array - worker should be created only once

  const executeCode = useCallback(
    async (code: string): Promise<ExecutionResult> => {
      console.log('[usePyodideWorker] executeCode called with:', code);

      if (!workerRef.current || !isReady) {
        const errorMsg = `Worker is not ready (worker: ${!!workerRef.current}, ready: ${isReady}, initError: ${initError})`;
        console.error('[usePyodideWorker]', errorMsg);
        return {
          output: [],
          error: initError || errorMsg,
          isComplete: false,
        };
      }

      return new Promise((resolve) => {
        const messageId = `exec-${Date.now()}-${Math.random()}`;
        console.log(
          `[usePyodideWorker] Starting execution with messageId: ${messageId}`,
        );

        const result: ExecutionResult = {
          output: [],
          error: null,
          isComplete: false,
        };

        setExecutionState('running');

        // Add timeout for execution
        const executionTimeout = setTimeout(() => {
          console.error(
            `[usePyodideWorker] Execution timeout for ${messageId}`,
          );
          result.error = 'Execution timeout (30s)';
          result.isComplete = true;
          messageHandlersRef.current.delete(messageId);
          setExecutionState('failed');
          resolve(result);
        }, 30000); // 30 second timeout

        // Register message handler
        const handler = (response: WorkerResponse) => {
          console.log(
            `[usePyodideWorker] Received response for ${messageId}:`,
            response.type,
          );

          switch (response.type) {
            case 'out':
              if (response.value) {
                console.log(
                  `[usePyodideWorker] Adding stdout for ${messageId}:`,
                  response.value,
                );
                result.output.push(response.value);
                onOutputChangeRef.current?.(result.output, result.error);
              }
              // Don't clear timeout or resolve - wait for more output or complete
              break;

            case 'err':
              if (response.value) {
                console.log(
                  `[usePyodideWorker] Adding stderr for ${messageId}:`,
                  response.value,
                );
                // Treat stderr as part of output for display purposes
                result.output.push(response.value);
                onOutputChangeRef.current?.(result.output, result.error);
              }
              // Don't clear timeout or resolve - wait for more output or complete
              break;

            case 'output':
              // Legacy output message - keep for compatibility
              if (response.content) {
                console.log(
                  `[usePyodideWorker] Adding output for ${messageId}:`,
                  response.content,
                );
                result.output.push(response.content);
                onOutputChangeRef.current?.(result.output, result.error);
              }
              break;

            case 'error':
              clearTimeout(executionTimeout);
              if (response.error) {
                console.error(
                  `[usePyodideWorker] Execution error for ${messageId}:`,
                  response.error,
                );
                result.error = response.error;
                onOutputChangeRef.current?.(result.output, result.error);
              }
              result.isComplete = true;
              messageHandlersRef.current.delete(messageId);
              setExecutionState('failed');
              resolve(result);
              break;

            case 'cancelled':
              clearTimeout(executionTimeout);
              console.log(
                `[usePyodideWorker] Execution cancelled for ${messageId}`,
              );
              result.isComplete = true;
              result.error = 'Execution interrupted by user';
              messageHandlersRef.current.delete(messageId);
              setExecutionState('cancelled');
              onOutputChangeRef.current?.(result.output, result.error);
              resolve(result);
              break;

            case 'complete':
              clearTimeout(executionTimeout);
              console.log(
                `[usePyodideWorker] Execution completed for ${messageId}`,
              );
              result.isComplete = true;
              messageHandlersRef.current.delete(messageId);
              setExecutionState('complete');
              resolve(result);
              break;
          }
        };

        messageHandlersRef.current.set(messageId, handler);
        console.log(`[usePyodideWorker] Registered handler for ${messageId}`);

        // Send execution request
        console.log(
          `[usePyodideWorker] Sending execute message to worker for ${messageId}`,
        );
        workerRef.current!.postMessage({
          type: 'execute',
          id: messageId,
          code,
        } as WorkerMessage);
      });
    },
    [isReady, initError],
  ); // Depend on isReady and initError

  const interruptExecution = useCallback(() => {
    console.log('[usePyodideWorker] Interrupting execution');
    if (workerRef.current && executionState === 'running') {
      setExecutionState('stopping');

      if (sharedBuffer && supportsSharedArrayBuffer) {
        // Immediate interrupt via SharedArrayBuffer
        console.log('[usePyodideWorker] Sending SIGINT via SharedArrayBuffer');
        const uint8View = new Uint8Array(sharedBuffer);
        uint8View[0] = 2; // SIGINT signal as per spec
      } else {
        // Fallback to message-based interrupt
        console.log(
          '[usePyodideWorker] Using fallback message-based interrupt',
        );
        workerRef.current.postMessage({
          type: 'interrupt',
          id: 'interrupt-fallback',
        } as WorkerMessage);
        // For fallback, we directly set to cancelled since we won't get proper cancellation
        setTimeout(() => {
          setExecutionState('cancelled');
        }, 100);
      }
    }
  }, [executionState, sharedBuffer, supportsSharedArrayBuffer]);

  return {
    isReady,
    isExecuting: executionState === 'running' || executionState === 'stopping',
    executionState,
    executeCode,
    interruptExecution,
    initError,
    supportsSharedArrayBuffer,
  };
}
