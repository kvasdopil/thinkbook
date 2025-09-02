import { useRef, useEffect, useCallback, useState } from 'react';

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

interface ExecutionResult {
  output: string[];
  error: string | null;
  isComplete: boolean;
}

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
  const [isExecuting, setIsExecuting] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
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

        setIsExecuting(true);

        // Add timeout for execution
        const executionTimeout = setTimeout(() => {
          console.error(
            `[usePyodideWorker] Execution timeout for ${messageId}`,
          );
          result.error = 'Execution timeout (30s)';
          result.isComplete = true;
          messageHandlersRef.current.delete(messageId);
          setIsExecuting(false);
          resolve(result);
        }, 30000); // 30 second timeout

        // Register message handler
        const handler = (response: WorkerResponse) => {
          console.log(
            `[usePyodideWorker] Received response for ${messageId}:`,
            response.type,
          );
          clearTimeout(executionTimeout);

          switch (response.type) {
            case 'output':
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
              setIsExecuting(false);
              resolve(result);
              break;

            case 'complete':
              console.log(
                `[usePyodideWorker] Execution completed for ${messageId}`,
              );
              result.isComplete = true;
              messageHandlersRef.current.delete(messageId);
              setIsExecuting(false);
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
    if (workerRef.current && isExecuting) {
      workerRef.current.postMessage({
        type: 'interrupt',
        id: 'interrupt',
      } as WorkerMessage);
      setIsExecuting(false);
    }
  }, [isExecuting]);

  return {
    isReady,
    isExecuting,
    executeCode,
    interruptExecution,
    initError,
  };
}
