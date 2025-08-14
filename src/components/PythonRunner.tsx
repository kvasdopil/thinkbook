'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FaRegEye,
  FaRegEyeSlash,
  FaRegCircle,
  FaSpinner,
  FaCheckCircle,
  FaTimesCircle,
  FaBan,
} from 'react-icons/fa';
import Editor from '@monaco-editor/react';
import { NotebookCell, useNotebook } from '@/hooks/notebook-store';
import type * as Monaco from 'monaco-editor';

type WorkerMessage =
  | { type: 'ready' }
  | { type: 'out'; value: string }
  | { type: 'err'; value: string }
  | { type: 'result'; value: string }
  | { type: 'error'; value: string }
  | { type: 'execution-cancelled' }
  | { type: 'done' };

export function PythonRunner({ onOutputChange }: { onOutputChange?: (output: string) => void }) {
  const notebook = useNotebook();
  const [output, setOutput] = useState<string>('');
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isEditorVisible, setIsEditorVisible] = useState<boolean>(false);
  type ExecutionStatus = 'idle' | 'running' | 'complete' | 'failed' | 'cancelled';
  const [status, setStatus] = useState<ExecutionStatus>('idle');
  const editorCodeRef = useRef<string>(`print('Hello from Python')`);
  const workerRef = useRef<Worker | null>(null);
  const workerInitOnceRef = useRef<boolean>(false);
  const editorInstanceRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const interruptSABRef = useRef<SharedArrayBuffer | null>(null);
  const stopRequestedRef = useRef<boolean>(false);
  const cancellationMessageShownRef = useRef<boolean>(false);
  const forceStopTimerRef = useRef<number | null>(null);
  const workerMessageHandlerRef = useRef<((e: MessageEvent<WorkerMessage>) => void) | null>(null);
  const errorOccurredRef = useRef<boolean>(false);

  // Register cell in notebook on mount
  useEffect(() => {
    const cellId = 'py-1';
    notebook.registerOrUpdateCell({
      id: cellId,
      type: 'python',
      text: editorCodeRef.current,
      status: 'idle',
      output: [],
    } as NotebookCell);
    notebook.registerController(cellId, {
      setText: (text: string) => {
        editorCodeRef.current = text;
        const editor = editorInstanceRef.current;
        if (editor && editor.getValue() !== text) {
          editor.setValue(text);
        }
      },
    });
    return () => {
      notebook.registerController(cellId, null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const appendOutput = useCallback((line: string) => {
    setOutput((prev) => prev + line);
  }, []);

  useEffect(() => {
    if (onOutputChange) onOutputChange(output);
    // Sync output to notebook store
    notebook.setCellOutput('py-1', output.split('\n'));
  }, [output, onOutputChange, notebook]);

  const onMessage = useCallback(
    (event: MessageEvent<WorkerMessage>) => {
      const msg = event.data;
      if (msg.type === 'ready') {
        setIsReady(true);
        return;
      }
      if (msg.type === 'out' || msg.type === 'err') {
        appendOutput(msg.value);
        return;
      }
      if (msg.type === 'result') {
        appendOutput(String(msg.value ?? ''));
        return;
      }
      if (msg.type === 'error') {
        appendOutput(`Error: ${msg.value}\n`);
        errorOccurredRef.current = true;
        setStatus('failed');
        return;
      }
      if (msg.type === 'execution-cancelled') {
        if (!cancellationMessageShownRef.current) {
          appendOutput('Execution interrupted by user\n');
          cancellationMessageShownRef.current = true;
        }
        if (forceStopTimerRef.current) {
          clearTimeout(forceStopTimerRef.current);
          forceStopTimerRef.current = null;
        }
        setStatus('cancelled');
        return;
      }
      if (msg.type === 'done') {
        setIsRunning(false);
        stopRequestedRef.current = false;
        cancellationMessageShownRef.current = false;
        if (forceStopTimerRef.current) {
          clearTimeout(forceStopTimerRef.current);
          forceStopTimerRef.current = null;
        }
        if (!errorOccurredRef.current && status !== 'cancelled') {
          setStatus('complete');
        }
        // reset error flag for next run
        errorOccurredRef.current = false;
        return;
      }
    },
    [appendOutput, status],
  );

  // Stable message callback ref to avoid re-subscribing the worker on parent re-renders
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const attachWorker = useCallback((w: Worker) => {
    const handler = (e: MessageEvent<WorkerMessage>) => onMessageRef.current(e);
    workerMessageHandlerRef.current = handler;
    w.addEventListener('message', handler);
    // Initialize and configure SAB
    w.postMessage({ type: 'init' });
    workerInitOnceRef.current = true;
    try {
      const sab = new SharedArrayBuffer(1);
      interruptSABRef.current = sab;
      w.postMessage({ type: 'setInterruptBuffer', sab });
    } catch (_e) {
      // SharedArrayBuffer not available (headers missing). We'll show an error on cancellation attempt
    }
  }, []);

  const recreateWorker = useCallback(() => {
    if (workerRef.current) {
      try {
        if (workerMessageHandlerRef.current) {
          workerRef.current.removeEventListener('message', workerMessageHandlerRef.current);
        }
        workerRef.current.terminate();
      } catch {
        // ignore
      }
    }
    const w = new Worker(new URL('../workers/pyodide.worker.ts', import.meta.url));
    workerRef.current = w;
    setIsReady(false);
    attachWorker(w);
  }, [attachWorker]);

  // Create worker only once for component lifecycle, and keep it alive across parent re-renders
  useEffect(() => {
    if (!workerRef.current) {
      const w = new Worker(new URL('../workers/pyodide.worker.ts', import.meta.url));
      workerRef.current = w;
      attachWorker(w);
    }
    return () => {
      if (workerRef.current && workerMessageHandlerRef.current) {
        workerRef.current.removeEventListener('message', workerMessageHandlerRef.current);
      }
      workerRef.current?.terminate();
      workerRef.current = null;
      workerMessageHandlerRef.current = null;
    };
    // Intentionally empty deps to keep worker alive across re-renders
  }, [attachWorker]);

  const run = useCallback(() => {
    if (!workerRef.current || !isReady) return;
    // Clear any previous interrupt signal before starting a new run
    if (interruptSABRef.current) {
      const buf = new Uint8Array(interruptSABRef.current);
      try {
        Atomics.store(buf as unknown as Int8Array, 0, 0);
      } catch {
        buf[0] = 0;
      }
    }
    stopRequestedRef.current = false;
    setIsRunning(true);
    setStatus('running');
    notebook.updateCellStatus('py-1', 'running');
    setOutput('');
    workerRef.current.postMessage({ type: 'run', code: editorCodeRef.current });
  }, [isReady, notebook]);

  const stop = useCallback(() => {
    if (!workerRef.current) return;
    if (!interruptSABRef.current) {
      appendOutput('Error: SharedArrayBuffer is not available. Ensure proper COOP/COEP headers.\n');
      return;
    }
    // Signal SIGINT to Pyodide. Must be done on main thread.
    const buf = new Uint8Array(interruptSABRef.current);
    try {
      Atomics.store(buf as unknown as Int8Array, 0, 2);
    } catch {
      buf[0] = 2;
    }
    stopRequestedRef.current = true;
    setIsRunning(true);
    appendOutput('Stopping...\n');
    appendOutput('Execution interrupted by user\n');
    setStatus('cancelled');
    notebook.updateCellStatus('py-1', 'cancelled');
    // Safety: force terminate and recreate worker if it doesn't acknowledge cancellation quickly
    if (forceStopTimerRef.current) {
      clearTimeout(forceStopTimerRef.current);
    }
    forceStopTimerRef.current = window.setTimeout(() => {
      // If we haven't received execution-cancelled/done yet, hard reset the worker
      recreateWorker();
      stopRequestedRef.current = false;
      cancellationMessageShownRef.current = false;
      setIsRunning(false);
      setStatus('cancelled');
      forceStopTimerRef.current = null;
    }, 1000);
  }, [appendOutput, recreateWorker, notebook]);

  const handleEditorChange = useCallback(
    (value?: string) => {
      editorCodeRef.current = value ?? '';
      notebook.setCellText('py-1', editorCodeRef.current);
    },
    [notebook],
  );

  const editor = useMemo(
    () => (
      <div
        className="w-full overflow-hidden transition-all duration-200"
        data-testid="code-editor"
        style={{ maxHeight: isEditorVisible ? 340 : 0, opacity: isEditorVisible ? 1 : 0 }}
        aria-hidden={!isEditorVisible}
      >
        <Editor
          height="300px"
          defaultLanguage="python"
          defaultValue={editorCodeRef.current}
          theme="vs"
          onChange={handleEditorChange}
          onMount={(editor) => {
            editorInstanceRef.current = editor;
            // Expose for e2e tests
            (window as unknown as { __pyEditor?: Monaco.editor.IStandaloneCodeEditor }).__pyEditor =
              editor;
          }}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
          }}
        />
      </div>
    ),
    [handleEditorChange, isEditorVisible],
  );

  const parseTopLevelComment = useCallback((): string => {
    const code = editorCodeRef.current ?? '';
    const lines = code.split('\n');
    const commentLines: string[] = [];
    for (const line of lines) {
      if (line.trim().startsWith('#')) {
        commentLines.push(line.replace(/^\s*#\s?/, ''));
      } else if (line.trim() === '') {
        // allow empty lines within the top comment block
        commentLines.push('');
      } else {
        break;
      }
    }
    return commentLines.join('\n').trim();
  }, []);

  const topLevelComment = parseTopLevelComment();

  const StatusIcon = useMemo(() => {
    switch (status) {
      case 'running':
        return <FaSpinner className="animate-spin" />;
      case 'complete':
        return <FaCheckCircle />;
      case 'failed':
        return <FaTimesCircle />;
      case 'cancelled':
        return <FaBan />;
      case 'idle':
      default:
        return <FaRegCircle />;
    }
  }, [status]);

  const statusColor = useMemo(() => {
    switch (status) {
      case 'running':
        return 'text-blue-600';
      case 'complete':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'cancelled':
        return 'text-orange-600';
      case 'idle':
      default:
        return 'text-gray-500';
    }
  }, [status]);

  return (
    <div className="flex flex-col gap-4 w-full max-w-3xl">
      {/* Code visibility toggle + status */}
      <div className="flex gap-2 items-center flex-wrap">
        <button
          className="px-3 py-2 rounded border border-black/[.08] hover:bg-[#f2f2f2] cursor-pointer flex items-center gap-2"
          aria-label={isEditorVisible ? 'Hide code' : 'Show code'}
          onClick={() => setIsEditorVisible((v) => !v)}
        >
          {isEditorVisible ? <FaRegEyeSlash /> : <FaRegEye />}
          <span className="text-sm">{isEditorVisible ? 'Hide code' : 'Show code'}</span>
        </button>
        <button
          className={`px-3 py-2 rounded border border-black/[.08] hover:bg-[#f2f2f2] cursor-pointer flex items-center gap-2 ${statusColor}`}
          aria-label={`Status: ${status}`}
          title={isRunning ? 'Stop' : 'Run'}
          onClick={isRunning ? stop : run}
        >
          {StatusIcon}
          <span className="text-sm capitalize">{status}</span>
        </button>
      </div>
      {editor}
      <div className="flex gap-2">
        <button
          className="px-4 py-2 rounded border border-black/[.08] hover:bg-[#f2f2f2] cursor-pointer"
          onClick={run}
          disabled={!isReady || isRunning}
        >
          {isRunning ? 'Running…' : 'Run'}
        </button>
        {isRunning ? (
          <button
            className="px-4 py-2 rounded border border-black/[.08] hover:bg-[#f2f2f2] cursor-pointer"
            onClick={stop}
          >
            Stop
          </button>
        ) : null}
      </div>
      {!isEditorVisible && topLevelComment ? (
        <div className="w-full p-3 rounded border border-black/[.08] bg-black/[.02] text-sm whitespace-pre-wrap">
          {topLevelComment}
        </div>
      ) : null}
      <pre className="whitespace-pre-wrap text-sm p-3 rounded border border-black/[.08] min-h-[120px]">
        {output}
      </pre>
    </div>
  );
}
