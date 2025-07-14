'use client'

import { Editor } from '@monaco-editor/react'
import { useState, useRef, useEffect } from 'react'
import { FaPlay, FaStop } from 'react-icons/fa'
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
  const [isStopping, setIsStopping] = useState(false)
  const [isWorkerReady, setIsWorkerReady] = useState(false)
  const [sharedArrayBufferSupported, setSharedArrayBufferSupported] =
    useState(false)
  const workerRef = useRef<Worker | null>(null)
  const outputRef = useRef<HTMLPreElement>(null)
  const interruptBufferRef = useRef<SharedArrayBuffer | null>(null)

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
    // Check SharedArrayBuffer support
    const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined'
    setSharedArrayBufferSupported(hasSharedArrayBuffer)

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

          // Set up interrupt buffer if SharedArrayBuffer is supported
          if (hasSharedArrayBuffer) {
            const buffer = new SharedArrayBuffer(1) // 1 byte for interrupt signal
            interruptBufferRef.current = buffer
            const setBufferMessage: PyodideMessage = {
              type: 'setInterruptBuffer',
              buffer,
            }
            worker.postMessage(setBufferMessage)
          }
          break
        case 'interrupt-buffer-set':
          // Buffer successfully set up
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
          setIsStopping(false)
          break
        case 'execution-cancelled':
          setOutput((prev) => prev + '\nExecution interrupted by user\n')
          setIsLoading(false)
          setIsStopping(false)
          setTimeout(scrollToBottomIfNeeded, 0)
          break
        case 'shared-array-buffer-unavailable':
          setOutput(
            (prev) =>
              prev +
              '\nError: SharedArrayBuffer not supported. Cancellation unavailable.\n'
          )
          setIsLoading(false)
          setIsStopping(false)
          setTimeout(scrollToBottomIfNeeded, 0)
          break
        case 'error':
          setOutput((prev) => prev + `\nError: ${error}`)
          setIsLoading(false)
          setIsStopping(false)
          setTimeout(scrollToBottomIfNeeded, 0)
          break
      }
    }

    worker.onerror = (error) => {
      setOutput((prev) => prev + `\nWorker error: ${error.message}`)
      setIsLoading(false)
      setIsStopping(false)
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
    setIsStopping(false)
    setOutput('') // Clear output when starting execution

    const executeMessage: PyodideMessage = {
      type: 'execute',
      code,
    }
    workerRef.current.postMessage(executeMessage)
  }

  const stopExecution = () => {
    if (!sharedArrayBufferSupported) {
      setOutput(
        (prev) =>
          prev +
          '\nError: SharedArrayBuffer not supported. Cancellation unavailable.\n'
      )
      setTimeout(scrollToBottomIfNeeded, 0)
      return
    }

    if (!interruptBufferRef.current) {
      setOutput(
        (prev) =>
          prev +
          '\nError: Interrupt buffer not initialized. Cancellation unavailable.\n'
      )
      setTimeout(scrollToBottomIfNeeded, 0)
      return
    }

    setIsStopping(true)

    // Set interrupt signal: buffer[0] = 2 triggers SIGINT in Pyodide
    // This must be done in the main thread as the worker might be blocked
    const view = new Uint8Array(interruptBufferRef.current)
    view[0] = 2
  }

  const getButtonContent = () => {
    if (isStopping) {
      return (
        <>
          <FaStop className="w-4 h-4 mr-2" />
          Stopping...
        </>
      )
    } else if (isLoading) {
      return (
        <>
          <FaPlay className="w-4 h-4 mr-2" />
          Running...
        </>
      )
    } else {
      return (
        <>
          <FaPlay className="w-4 h-4 mr-2" />
          Run
        </>
      )
    }
  }

  const getStopButtonContent = () => {
    return (
      <>
        <FaStop className="w-4 h-4 mr-2" />
        {isStopping ? 'Stopping...' : 'Stop'}
      </>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex justify-between items-center">
          <h3 className="text-sm font-medium text-gray-700">Python Editor</h3>
          <div className="flex gap-2">
            {isLoading ? (
              <>
                <button
                  onClick={runCode}
                  disabled={true}
                  className="px-4 py-2 rounded text-sm font-medium transition-colors bg-gray-400 text-gray-200 cursor-not-allowed flex items-center"
                >
                  {getButtonContent()}
                </button>
                <button
                  onClick={stopExecution}
                  disabled={isStopping}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center ${
                    !isStopping
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
                >
                  {getStopButtonContent()}
                </button>
              </>
            ) : (
              <button
                onClick={runCode}
                disabled={!isWorkerReady}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center ${
                  isWorkerReady
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                }`}
              >
                {getButtonContent()}
              </button>
            )}
          </div>
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
        <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex justify-between items-center">
          <h3 className="text-sm font-medium text-gray-700">Output</h3>
          {!sharedArrayBufferSupported && (
            <span className="text-xs text-orange-600 font-medium">
              ⚠️ SharedArrayBuffer not supported - cancellation unavailable
            </span>
          )}
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
