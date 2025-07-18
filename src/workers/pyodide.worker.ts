/// <reference lib="webworker" />

// Import Pyodide from CDN
importScripts('https://cdn.jsdelivr.net/npm/pyodide@0.28.0/pyodide.js')

import type { PyodideMessage, PyodideResponse } from '../types/worker'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pyodide: any = null
let pendingInterruptBuffer: SharedArrayBuffer | null = null

async function initializePyodide() {
  try {
    // @ts-expect-error - loadPyodide is loaded from external script
    pyodide = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/npm/pyodide@0.28.0/',
    })

    // Load pandas
    await pyodide.loadPackage('pandas')

    // Set up pending interrupt buffer if one was provided before initialization
    if (pendingInterruptBuffer) {
      console.log('[Worker] Setting up pending interrupt buffer')
      setInterruptBufferInternal(pendingInterruptBuffer)
      pendingInterruptBuffer = null
    }

    const response: PyodideResponse = {
      type: 'init-complete',
    }
    console.log('[Worker] Sending response:', response)
    self.postMessage(response)
  } catch (error) {
    const response: PyodideResponse = {
      type: 'error',
      error: `Failed to initialize Pyodide: ${error}`,
    }
    console.log('[Worker] Sending error response:', response)
    self.postMessage(response)
  }
}

function setInterruptBufferInternal(buffer: SharedArrayBuffer) {
  try {
    // Pyodide expects a Uint8Array, not raw SharedArrayBuffer
    const interruptBuffer = new Uint8Array(buffer)
    pyodide.setInterruptBuffer(interruptBuffer)

    const response: PyodideResponse = {
      type: 'interrupt-buffer-set',
    }
    console.log('[Worker] Sending response:', response)
    self.postMessage(response)
  } catch (error) {
    const response: PyodideResponse = {
      type: 'error',
      error: `Failed to set interrupt buffer: ${error}`,
    }
    console.log('[Worker] Sending error response:', response)
    self.postMessage(response)
  }
}

function setInterruptBuffer(buffer: SharedArrayBuffer) {
  if (pyodide === null) {
    // Pyodide not initialized yet, store buffer for later
    console.log(
      '[Worker] Pyodide not ready, storing interrupt buffer for later'
    )
    pendingInterruptBuffer = buffer
    return
  }

  setInterruptBufferInternal(buffer)
}

async function executeCode(id: string, code: string) {
  if (!pyodide) {
    const response: PyodideResponse = {
      id,
      type: 'error',
      error: 'Pyodide not initialized',
    }
    console.log('[Worker] Sending error response:', response)
    self.postMessage(response)
    return
  }

  try {
    // Set up JavaScript callbacks for streaming output
    pyodide.globals.set('_stream_stdout', (text: string) => {
      const response: PyodideResponse = {
        id,
        type: 'output',
        output: {
          type: 'out',
          value: text,
        },
      }
      console.log('[Worker] Sending output response:', response)
      self.postMessage(response)
    })

    pyodide.globals.set('_stream_stderr', (text: string) => {
      const response: PyodideResponse = {
        id,
        type: 'output',
        output: {
          type: 'err',
          value: text,
        },
      }
      console.log('[Worker] Sending error output response:', response)
      self.postMessage(response)
    })

    // New callback for displaying tables
    pyodide.globals.set(
      '_display_table',
      (df_json: string, total_rows: number) => {
        const { columns, data } = JSON.parse(df_json)
        const response: PyodideResponse = {
          id,
          type: 'table',
          table: {
            columns,
            data,
            totalRows: total_rows,
          },
        }
        console.log('[Worker] Sending table response:', response)
        self.postMessage(response)
      }
    )

    // Override print, stderr, and add display to call our streaming functions
    pyodide.runPython(`
import sys
import builtins
import pandas as pd
import json

# Store original functions
_original_print = builtins.print
_original_stderr_write = sys.stderr.write

def _streaming_print(*args, **kwargs):
    """Custom print function that streams output immediately"""
    import io
    output_buffer = io.StringIO()
    kwargs_copy = kwargs.copy()
    kwargs_copy['file'] = output_buffer
    _original_print(*args, **kwargs_copy)
    output_text = output_buffer.getvalue()
    if output_text:
        _stream_stdout(output_text)

def _streaming_stderr_write(text):
    """Custom stderr write function that streams errors immediately"""
    if text:
        _stream_stderr(text)
    return len(text)

def display(obj):
    """Custom display function for notebook-like table rendering"""
    if isinstance(obj, pd.DataFrame):
        total_rows = len(obj)
        # Get up to 50 rows for preview
        df_preview = obj.head(50)

        # Convert preview to JSON split format (without index)
        df_json = df_preview.to_json(orient="split", index=False)

        # Send JSON and total_rows separately
        _display_table(df_json, total_rows)
    else:
        # Fallback to standard print for non-DataFrames
        _original_print(obj)

# Replace print, sys.stderr.write and add display
builtins.print = _streaming_print
sys.stderr.write = _streaming_stderr_write
builtins.display = display
`)

    try {
      // Execute user code safely using globals.set and exec
      pyodide.globals.set('user_code', code)
      pyodide.runPython('exec(user_code)')

      // Send completion message
      const response: PyodideResponse = {
        id,
        type: 'result',
        result: '', // Empty result since output was streamed
      }
      console.log('[Worker] Sending result response:', response)
      self.postMessage(response)
    } finally {
      // Always restore original functions
      pyodide.runPython(`
builtins.print = _original_print
sys.stderr.write = _original_stderr_write
del builtins.display
`)
    }
  } catch (error) {
    // Always restore original functions on error
    try {
      pyodide.runPython(`
builtins.print = _original_print
sys.stderr.write = _original_stderr_write
del builtins.display
`)
    } catch {}

    // Check if this was a KeyboardInterrupt (cancellation)
    const errorString = String(error)
    if (errorString.includes('KeyboardInterrupt')) {
      const response: PyodideResponse = {
        id,
        type: 'execution-cancelled',
      }
      console.log('[Worker] Sending execution-cancelled response:', response)
      self.postMessage(response)
    } else {
      const response: PyodideResponse = {
        id,
        type: 'error',
        error: errorString,
      }
      console.log('[Worker] Sending error response:', response)
      self.postMessage(response)
    }
  }
}

self.onmessage = async (event: MessageEvent<PyodideMessage>) => {
  console.log('[Worker] Received message:', event.data)
  const { type, id, code, buffer } = event.data

  switch (type) {
    case 'init':
      console.log('[Worker] Processing init message')
      await initializePyodide()
      break
    case 'execute':
      if (id && code) {
        console.log(
          `[Worker] Processing execute message for cell ${id} with code:`,
          code.slice(0, 100) + (code.length > 100 ? '...' : '')
        )
        await executeCode(id, code)
      }
      break
    case 'setInterruptBuffer':
      if (buffer) {
        console.log('[Worker] Processing setInterruptBuffer message')
        setInterruptBuffer(buffer)
      }
      break
    case 'cancel':
      console.log('[Worker] Received cancel message (handled in main thread)')
      // This message is handled in the main thread, not here
      // The main thread will set buffer[0] = 2 to trigger interruption
      break
  }
}
