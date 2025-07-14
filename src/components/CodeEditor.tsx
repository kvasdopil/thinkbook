'use client'

import { Editor } from '@monaco-editor/react'
import { useState, useRef, useEffect } from 'react'

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

  useEffect(() => {
    // Initialize web worker
    const worker = new Worker(
      new URL('../workers/pyodide.worker.ts', import.meta.url)
    )
    workerRef.current = worker

    worker.onmessage = (event) => {
      const { type, result, error } = event.data

      switch (type) {
        case 'init-complete':
          setIsWorkerReady(true)
          setOutput('Python environment ready! 🐍')
          break
        case 'result':
          setOutput(result || '(no output)')
          setIsLoading(false)
          break
        case 'error':
          setOutput(`Error: ${error}`)
          setIsLoading(false)
          break
      }
    }

    worker.onerror = (error) => {
      setOutput(`Worker error: ${error.message}`)
      setIsLoading(false)
    }

    // Initialize Pyodide
    worker.postMessage({ type: 'init' })

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
    setOutput('Running...')
    workerRef.current.postMessage({ type: 'execute', code })
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
        <div className="p-4 bg-gray-50 min-h-32">
          <pre className="text-sm font-mono whitespace-pre-wrap text-gray-800">
            {output}
          </pre>
        </div>
      </div>
    </div>
  )
}
