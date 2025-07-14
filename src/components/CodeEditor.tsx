'use client'

import { Editor } from '@monaco-editor/react'
import { useState, useRef, useEffect } from 'react'
import type { PyodideMessage, PyodideResponse } from '../types/worker'

interface CodeEditorProps {
  initialCode?: string
  onCodeChange?: (code: string) => void
}

export default function CodeEditor({
  initialCode = '# Write your Python code here\nprint("Hello, World!")',
  onCodeChange,
}: CodeEditorProps) {
  const [code, setCode] = useState(initialCode)
  const [output, setOutput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isWorkerReady, setIsWorkerReady] = useState(false)
  const workerRef = useRef<Worker | null>(null)
  const outputRef = useRef<HTMLPreElement>(null)

  // Auto-scroll helper function
  const scrollToBottomIfNeeded = () => {
    if (outputRef.current) {
      const element = outputRef.current
      const isAtBottom =
        element.scrollHeight - element.scrollTop <= element.clientHeight + 1

      if (isAtBottom) {
        element.scrollTop = element.scrollHeight
      }
    }
  }

  useEffect(() => {
    // Initialize web worker
    const worker = new Worker(
      new URL('../workers/pyodide.worker.ts', import.meta.url)
    )
    workerRef.current = worker

    worker.onmessage = (event: MessageEvent<PyodideResponse>) => {
      const { type, error, output: streamOutput } = event.data

      switch (type) {
        case 'init-complete':
          setIsWorkerReady(true)
          setOutput('Python environment ready! 🐍')
          break
        case 'output':
          if (streamOutput) {
            setOutput((prev) => prev + streamOutput.value)
            // Use setTimeout to ensure DOM update before scrolling
            setTimeout(scrollToBottomIfNeeded, 0)
          }
          break
        case 'result':
          // Execution completed successfully
          setIsLoading(false)
          break
        case 'error':
          setOutput((prev) => prev + `\nError: ${error}`)
          setIsLoading(false)
          setTimeout(scrollToBottomIfNeeded, 0)
          break
      }
    }

    worker.onerror = (error) => {
      setOutput((prev) => prev + `\nWorker error: ${error.message}`)
      setIsLoading(false)
      setTimeout(scrollToBottomIfNeeded, 0)
    }

    // Initialize Pyodide
    const initMessage: PyodideMessage = { type: 'init' }
    worker.postMessage(initMessage)

    return () => {
      worker.terminate()
    }
  }, [])

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || ''
    setCode(newCode)
    onCodeChange?.(newCode)
  }

  const runCode = () => {
    if (!workerRef.current || !isWorkerReady) {
      setOutput('Python environment not ready yet...')
      return
    }

    setIsLoading(true)
    setOutput('') // Clear output when starting execution

    const executeMessage: PyodideMessage = { type: 'execute', code }
    workerRef.current.postMessage(executeMessage)
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex justify-between items-center">
          <h3 className="text-sm font-medium text-gray-700">Python Editor</h3>
          <button
            onClick={runCode}
            disabled={!isWorkerReady || isLoading}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              isWorkerReady && !isLoading
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
            }`}
          >
            {isLoading ? 'Running...' : 'Run'}
          </button>
        </div>
        <div className="h-64">
          <Editor
            height="100%"
            defaultLanguage="python"
            value={code}
            onChange={handleCodeChange}
            theme="vs-light"
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 14,
              wordWrap: 'on',
              automaticLayout: true,
            }}
          />
        </div>
      </div>

      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <div className="bg-gray-100 px-4 py-2 border-b border-gray-300">
          <h3 className="text-sm font-medium text-gray-700">Output</h3>
        </div>
        <div className="p-4 bg-gray-50 min-h-32 max-h-96 overflow-y-auto">
          <pre
            ref={outputRef}
            className="text-sm font-mono whitespace-pre-wrap text-gray-800"
          >
            {output}
          </pre>
        </div>
      </div>
    </div>
  )
}
