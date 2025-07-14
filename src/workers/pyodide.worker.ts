/// <reference lib="webworker" />

// Import Pyodide from CDN
importScripts('https://cdn.jsdelivr.net/npm/pyodide@0.28.0/pyodide.js')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pyodide: any = null

interface PyodideMessage {
  type: 'init' | 'execute'
  code?: string
}

interface PyodideResponse {
  type: 'init-complete' | 'result' | 'error'
  result?: string
  error?: string
}

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
    // Capture stdout
    pyodide.runPython(`
import sys
from io import StringIO
_captured_output = StringIO()
sys.stdout = _captured_output
sys.stderr = _captured_output
`)

    // Execute user code safely using globals.set and exec
    pyodide.globals.set('user_code', code)
    pyodide.runPython('exec(user_code)')

    // Get captured output
    const output = pyodide.runPython('_captured_output.getvalue()')

    // Reset stdout/stderr
    pyodide.runPython(`
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__
`)

    const response: PyodideResponse = {
      type: 'result',
      result: output || '',
    }
    self.postMessage(response)
  } catch (error) {
    // Reset stdout/stderr on error
    try {
      pyodide.runPython(`
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__
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
