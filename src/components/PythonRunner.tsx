'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
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
  const [output, setOutput] = useState<string>('');
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const editorCodeRef = useRef<string>(`print('Hello from Python')`);
  const workerRef = useRef<Worker | null>(null);
  const workerInitOnceRef = useRef<boolean>(false);
  const editorInstanceRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const interruptSABRef = useRef<SharedArrayBuffer | null>(null);
  const stopRequestedRef = useRef<boolean>(false);
  const cancellationMessageShownRef = useRef<boolean>(false);
  const forceStopTimerRef = useRef<number | null>(null);
  const workerMessageHandlerRef = useRef<((e: MessageEvent<WorkerMessage>) => void) | null>(null);

  const appendOutput = useCallback((line: string) => {
    setOutput((prev) => prev + line);
  }, []);

  useEffect(() => {
    if (onOutputChange) onOutputChange(output);
  }, [output, onOutputChange]);

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
        return;
      }
    },
    [appendOutput],
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
    setOutput('');
    workerRef.current.postMessage({ type: 'run', code: editorCodeRef.current });
  }, [isReady]);

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
      forceStopTimerRef.current = null;
    }, 1000);
  }, [appendOutput, recreateWorker]);

  const handleEditorChange = useCallback((value?: string) => {
    editorCodeRef.current = value ?? '';
  }, []);

  const editor = useMemo(
    () => (
      <div className="w-full">
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
    [handleEditorChange],
  );

  return (
    <div className="flex flex-col gap-4 w-full max-w-3xl">
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
      <pre className="whitespace-pre-wrap text-sm p-3 rounded border border-black/[.08] min-h-[120px]">
        {output}
      </pre>
    </div>
  );
}
