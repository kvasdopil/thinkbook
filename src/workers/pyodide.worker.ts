/// <reference lib="webworker" />

// Import Pyodide from CDN
importScripts('https://cdn.jsdelivr.net/npm/pyodide@0.28.0/pyodide.js')

import type { PyodideMessage, PyodideResponse } from '../types/worker'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pyodide: any = null

async function initializePyodide() {
  try {
    // @ts-expect-error - loadPyodide is loaded from external script
    pyodide = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/npm/pyodide@0.28.0/',
    })

    const response: PyodideResponse = {
      type: 'init-complete',
    }
    self.postMessage(response)
  } catch (error) {
    const response: PyodideResponse = {
      type: 'error',
      error: `Failed to initialize Pyodide: ${error}`,
    }
    self.postMessage(response)
  }
}

async function executeCode(code: string) {
  if (!pyodide) {
    const response: PyodideResponse = {
      type: 'error',
      error: 'Pyodide not initialized',
    }
    self.postMessage(response)
    return
  }

  try {
    // Set up JavaScript callbacks for streaming output
    pyodide.globals.set('_stream_stdout', (text: string) => {
      const response: PyodideResponse = {
        type: 'output',
        output: {
          type: 'out',
          value: text,
        },
      }
      self.postMessage(response)
    })

    pyodide.globals.set('_stream_stderr', (text: string) => {
      const response: PyodideResponse = {
        type: 'output',
        output: {
          type: 'err',
          value: text,
        },
      }
      self.postMessage(response)
    })

    // Override print and sys.stderr to call our streaming functions
    pyodide.runPython(`
import sys
import builtins

# Store original functions
_original_print = builtins.print
_original_stderr_write = sys.stderr.write

def _streaming_print(*args, **kwargs):
    """Custom print function that streams output immediately"""
    # Copy kwargs and ensure we handle the file parameter
    import io
    
    # Create a StringIO to capture the formatted output
    output_buffer = io.StringIO()
    
    # Use original print to format the output into our buffer
    _original_print(*args, **kwargs, file=output_buffer)
    
    # Get the formatted output and send it via JavaScript callback
    output_text = output_buffer.getvalue()
    if output_text:
        _stream_stdout(output_text)

def _streaming_stderr_write(text):
    """Custom stderr write function that streams errors immediately"""
    if text:
        _stream_stderr(text)
    return len(text)

# Replace print and sys.stderr.write with streaming versions
builtins.print = _streaming_print
sys.stderr.write = _streaming_stderr_write
`)

    try {
      // Execute user code safely using globals.set and exec
      pyodide.globals.set('user_code', code)
      pyodide.runPython('exec(user_code)')

      // Send completion message
      const response: PyodideResponse = {
        type: 'result',
        result: '', // Empty result since output was streamed
      }
      self.postMessage(response)
    } finally {
      // Always restore original functions
      pyodide.runPython(`
builtins.print = _original_print
sys.stderr.write = _original_stderr_write
`)
    }
  } catch (error) {
    // Always restore original functions on error
    try {
      pyodide.runPython(`
builtins.print = _original_print
sys.stderr.write = _original_stderr_write
`)
    } catch {}

    const response: PyodideResponse = {
      type: 'error',
      error: String(error),
    }
    self.postMessage(response)
  }
}

self.onmessage = async (event: MessageEvent<PyodideMessage>) => {
  const { type, code } = event.data

  switch (type) {
    case 'init':
      await initializePyodide()
      break
    case 'execute':
      if (code) {
        await executeCode(code)
      }
      break
  }
}
