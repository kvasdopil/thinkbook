import React, {
  createContext,
  useRef,
  useEffect,
  useState,
  useCallback,
} from 'react';
import type {
  WorkerMessage,
  WorkerResponse,
  ExecutionResult,
} from '../types/worker';

interface SharedPyodideContextValue {
  isReady: boolean;
  isExecuting: boolean;
  executeCode: (
    code: string,
    onOutputChange?: (output: string[], error: string | null) => void,
  ) => Promise<ExecutionResult>;
  interruptExecution: () => void;
  initError: string | null;
  supportsSharedArrayBuffer: boolean | null;
}

const SharedPyodideContext = createContext<SharedPyodideContextValue | null>(
  null,
);

interface SharedPyodideProviderProps {
  children: React.ReactNode;
}

export function SharedPyodideProvider({
  children,
}: SharedPyodideProviderProps) {
  const workerRef = useRef<Worker | null>(null);
  const isInitializedRef = useRef(false);
  const messageHandlersRef = useRef<
    Map<string, (response: WorkerResponse) => void>
  >(new Map());
  const [isReady, setIsReady] = useState(false);
  // Remove global execution state - let individual cells manage their own state
  const [initError, setInitError] = useState<string | null>(null);
  const [sharedBuffer, setSharedBuffer] = useState<SharedArrayBuffer | null>(
    null,
  );
  const [supportsSharedArrayBuffer, setSupportsSharedArrayBuffer] = useState<
    boolean | null
  >(null);
  const sharedBufferRef = useRef<SharedArrayBuffer | null>(null);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const executingCellsRef = useRef<Set<string>>(new Set());

  // Initialize worker - this should only happen once
  useEffect(() => {
    if (workerRef.current || isInitializedRef.current) {
      console.log(
        '[SharedPyodideContext] Worker already exists, skipping initialization',
      );
      return;
    }

    console.log('[SharedPyodideContext] Initializing shared Pyodide worker');
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
      console.log('[SharedPyodideContext] SharedArrayBuffer is supported');
      const buffer = new SharedArrayBuffer(1);
      setSharedBuffer(buffer);
      sharedBufferRef.current = buffer;
    } else {
      console.warn(
        '[SharedPyodideContext] SharedArrayBuffer is not supported - immediate cancellation unavailable',
      );
    }

    try {
      // Set timeout for worker initialization
      initTimeoutRef.current = setTimeout(() => {
        console.error(
          '[SharedPyodideContext] Worker initialization timeout (120s)',
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
      console.log('[SharedPyodideContext] Creating worker with URL');
      const worker = new Worker(
        new URL('../workers/pyodideWorker.ts', import.meta.url),
        { type: 'module' },
      );

      console.log('[SharedPyodideContext] Worker created successfully');
      workerRef.current = worker;
      isInitializedRef.current = true;

      // Handle messages from worker
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const { type, id, error } = event.data;
        console.log(
          `[SharedPyodideContext] Received message: ${type} (id: ${id})`,
        );

        // Handle global ready message
        if (type === 'ready' && id === 'init') {
          console.log('[SharedPyodideContext] Worker is ready!');
          if (initTimeoutRef.current) {
            clearTimeout(initTimeoutRef.current);
            initTimeoutRef.current = null;
          }
          setIsReady(true);
          setInitError(null);

          // Send SharedArrayBuffer to worker if available
          if (hasSharedArrayBuffer && sharedBufferRef.current) {
            console.log(
              '[SharedPyodideContext] Sending interrupt buffer to worker',
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
            '[SharedPyodideContext] Worker initialization error:',
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
            `[SharedPyodideContext] No handler found for message id: ${id}`,
          );
        }
      };

      worker.onerror = (error) => {
        console.error('[SharedPyodideContext] Worker error:', error);
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
          initTimeoutRef.current = null;
        }
        setInitError(`Worker error: ${error.message || 'Unknown error'}`);
        setIsReady(false);
      };

      worker.onmessageerror = (error) => {
        console.error('[SharedPyodideContext] Worker message error:', error);
        setInitError(
          `Worker message error: ${error.type || 'Unknown message error'}`,
        );
      };

      // Initialize the worker
      console.log('[SharedPyodideContext] Sending init message to worker');
      worker.postMessage({ type: 'init', id: 'init' } as WorkerMessage);
    } catch (error) {
      console.error('[SharedPyodideContext] Failed to create worker:', error);
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
      console.log('[SharedPyodideContext] Cleaning up worker');
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
    async (
      code: string,
      onOutputChange?: (output: string[], error: string | null) => void,
    ): Promise<ExecutionResult> => {
      console.log('[SharedPyodideContext] executeCode called with:', code);

      if (!workerRef.current || !isReady) {
        const errorMsg = `Worker is not ready (worker: ${!!workerRef.current}, ready: ${isReady}, initError: ${initError})`;
        console.error('[SharedPyodideContext]', errorMsg);
        return {
          output: [],
          error: initError || errorMsg,
          isComplete: false,
        };
      }

      return new Promise((resolve) => {
        const messageId = `exec-${Date.now()}-${Math.random()}`;
        console.log(
          `[SharedPyodideContext] Starting execution with messageId: ${messageId}`,
        );

        // Track this execution
        executingCellsRef.current.add(messageId);

        const result: ExecutionResult = {
          output: [],
          error: null,
          isComplete: false,
        };

        // Add timeout for execution
        const executionTimeout = setTimeout(() => {
          console.error(
            `[SharedPyodideContext] Execution timeout for ${messageId}`,
          );
          result.error = 'Execution timeout (30s)';
          result.isComplete = true;
          messageHandlersRef.current.delete(messageId);
          executingCellsRef.current.delete(messageId);
          resolve(result);
        }, 30000); // 30 second timeout

        // Register message handler
        const handler = (response: WorkerResponse) => {
          console.log(
            `[SharedPyodideContext] Received response for ${messageId}:`,
            response.type,
          );

          switch (response.type) {
            case 'out':
              if (response.value) {
                console.log(
                  `[SharedPyodideContext] Adding stdout for ${messageId}:`,
                  response.value,
                );
                result.output.push(response.value);
                onOutputChange?.(result.output, result.error);
              }
              // Don't clear timeout or resolve - wait for more output or complete
              break;

            case 'err':
              if (response.value) {
                console.log(
                  `[SharedPyodideContext] Adding stderr for ${messageId}:`,
                  response.value,
                );
                // Treat stderr as part of output for display purposes
                result.output.push(response.value);
                onOutputChange?.(result.output, result.error);
              }
              // Don't clear timeout or resolve - wait for more output or complete
              break;

            case 'output':
              // Legacy output message - keep for compatibility
              if (response.content) {
                console.log(
                  `[SharedPyodideContext] Adding output for ${messageId}:`,
                  response.content,
                );
                result.output.push(response.content);
                onOutputChange?.(result.output, result.error);
              }
              break;

            case 'error':
              clearTimeout(executionTimeout);
              if (response.error) {
                console.error(
                  `[SharedPyodideContext] Execution error for ${messageId}:`,
                  response.error,
                );
                result.error = response.error;
                onOutputChange?.(result.output, result.error);
              }
              result.isComplete = true;
              messageHandlersRef.current.delete(messageId);
              executingCellsRef.current.delete(messageId);
              resolve(result);
              break;

            case 'cancelled':
              clearTimeout(executionTimeout);
              console.log(
                `[SharedPyodideContext] Execution cancelled for ${messageId}`,
              );
              result.isComplete = true;
              result.error = 'Execution interrupted by user';
              messageHandlersRef.current.delete(messageId);
              executingCellsRef.current.delete(messageId);
              onOutputChange?.(result.output, result.error);
              resolve(result);
              break;

            case 'complete':
              clearTimeout(executionTimeout);
              console.log(
                `[SharedPyodideContext] Execution completed for ${messageId}`,
              );
              result.isComplete = true;
              messageHandlersRef.current.delete(messageId);
              executingCellsRef.current.delete(messageId);
              resolve(result);
              break;
          }
        };

        messageHandlersRef.current.set(messageId, handler);
        console.log(
          `[SharedPyodideContext] Registered handler for ${messageId}`,
        );

        // Send execution request
        console.log(
          `[SharedPyodideContext] Sending execute message to worker for ${messageId}`,
        );
        workerRef.current!.postMessage({
          type: 'execute',
          id: messageId,
          code,
        } as WorkerMessage);
      });
    },
    [isReady, initError],
  );

  const interruptExecution = useCallback(() => {
    console.log('[SharedPyodideContext] Interrupting execution');
    if (workerRef.current && executingCellsRef.current.size > 0) {
      if (sharedBuffer && supportsSharedArrayBuffer) {
        // Immediate interrupt via SharedArrayBuffer
        console.log(
          '[SharedPyodideContext] Sending SIGINT via SharedArrayBuffer',
        );
        const uint8View = new Uint8Array(sharedBuffer);
        uint8View[0] = 2; // SIGINT signal as per spec
      } else {
        // Fallback to message-based interrupt
        console.log(
          '[SharedPyodideContext] Using fallback message-based interrupt',
        );
        workerRef.current.postMessage({
          type: 'interrupt',
          id: 'interrupt-fallback',
        } as WorkerMessage);
      }
    }
  }, [sharedBuffer, supportsSharedArrayBuffer]);

  const contextValue: SharedPyodideContextValue = {
    isReady,
    isExecuting: executingCellsRef.current.size > 0,
    executeCode,
    interruptExecution,
    initError,
    supportsSharedArrayBuffer: supportsSharedArrayBuffer ?? false,
  };

  return (
    <SharedPyodideContext.Provider value={contextValue}>
      {children}
    </SharedPyodideContext.Provider>
  );
}

// Export the context for external hook
export { SharedPyodideContext };
