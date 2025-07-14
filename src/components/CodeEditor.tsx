'use client'

import { Editor } from '@monaco-editor/react'
import { useState, useRef, useEffect } from 'react'
import {
  FaRegEye,
  FaRegEyeSlash,
  FaCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationCircle,
} from 'react-icons/fa'
import type { PyodideMessage, PyodideResponse } from '../types/worker'

// Execution status enum
type ExecutionStatus = 'idle' | 'running' | 'complete' | 'failed' | 'cancelled'

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
  const [isCodeVisible, setIsCodeVisible] = useState(false) // Default: code editor hidden
  const [executionStatus, setExecutionStatus] =
    useState<ExecutionStatus>('idle')
  const [sharedArrayBufferSupported, setSharedArrayBufferSupported] =
    useState(false)
  const workerRef = useRef<Worker | null>(null)
  const outputRef = useRef<HTMLPreElement>(null)
  const interruptBufferRef = useRef<SharedArrayBuffer | null>(null)

  // Extract top-level comment for markdown display
  const getTopLevelComment = () => {
    const lines = code.split('\n')
    const commentLines = []

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('#')) {
        commentLines.push(trimmed.substring(1).trim())
      } else if (trimmed === '') {
        // Skip empty lines
        continue
      } else {
        // Stop at first non-comment, non-empty line
        break
      }
    }

    return commentLines.length > 0 ? commentLines.join(' ') : 'Python Code Cell'
  }

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
          setExecutionStatus('complete')
          break
        case 'execution-cancelled':
          setOutput((prev) => prev + '\nExecution interrupted by user\n')
          setIsLoading(false)
          setIsStopping(false)
          setExecutionStatus('cancelled')
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
          setExecutionStatus('failed')
          setTimeout(scrollToBottomIfNeeded, 0)
          break
        case 'error':
          setOutput((prev) => prev + `\nError: ${error}`)
          setIsLoading(false)
          setIsStopping(false)
          setExecutionStatus('failed')
          setTimeout(scrollToBottomIfNeeded, 0)
          break
      }
    }

    worker.onerror = (error) => {
      setOutput((prev) => prev + `\nWorker error: ${error.message}`)
      setIsLoading(false)
      setIsStopping(false)
      setExecutionStatus('failed')
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
    // Reset status to idle when code changes
    if (executionStatus !== 'running') {
      setExecutionStatus('idle')
    }
  }

  const runCode = () => {
    if (!workerRef.current || !isWorkerReady) {
      setOutput('Python environment not ready yet...')
      return
    }

    setIsLoading(true)
    setIsStopping(false)
    setExecutionStatus('running')
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

  const toggleCodeVisibility = () => {
    setIsCodeVisible(!isCodeVisible)
  }

  // Get status button color and icon based on execution status
  const getStatusButtonProps = () => {
    if (isLoading) {
      return {
        icon: FaCircle,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50 hover:bg-blue-100',
        title: 'Stop',
        action: stopExecution,
        disabled: isStopping,
      }
    }

    switch (executionStatus) {
      case 'running':
        return {
          icon: FaCircle,
          color: 'text-blue-500',
          bgColor: 'bg-blue-50 hover:bg-blue-100',
          title: 'Stop',
          action: stopExecution,
          disabled: isStopping,
        }
      case 'complete':
        return {
          icon: FaCheckCircle,
          color: 'text-green-500',
          bgColor: 'bg-green-50 hover:bg-green-100',
          title: 'Run',
          action: runCode,
          disabled: !isWorkerReady,
        }
      case 'failed':
        return {
          icon: FaTimesCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-50 hover:bg-red-100',
          title: 'Run',
          action: runCode,
          disabled: !isWorkerReady,
        }
      case 'cancelled':
        return {
          icon: FaExclamationCircle,
          color: 'text-orange-500',
          bgColor: 'bg-orange-50 hover:bg-orange-100',
          title: 'Run',
          action: runCode,
          disabled: !isWorkerReady,
        }
      default: // idle
        return {
          icon: FaCircle,
          color: 'text-gray-400',
          bgColor: 'bg-gray-50 hover:bg-gray-100',
          title: 'Run',
          action: runCode,
          disabled: !isWorkerReady,
        }
    }
  }

  const statusButtonProps = getStatusButtonProps()
  const StatusIcon = statusButtonProps.icon

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium text-gray-700">
              {isCodeVisible ? 'Python Editor' : getTopLevelComment()}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {/* Status Button */}
            <button
              onClick={statusButtonProps.action}
              disabled={statusButtonProps.disabled}
              title={statusButtonProps.title}
              className={`p-2 rounded-full transition-colors ${statusButtonProps.bgColor} ${
                statusButtonProps.disabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'cursor-pointer'
              }`}
              aria-label={`${statusButtonProps.title} code execution`}
            >
              <StatusIcon className={`w-4 h-4 ${statusButtonProps.color}`} />
            </button>

            {/* Toggle Code Visibility Button */}
            <button
              onClick={toggleCodeVisibility}
              className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors"
              aria-label={
                isCodeVisible ? 'Hide code editor' : 'Show code editor'
              }
              title={isCodeVisible ? 'Hide code editor' : 'Show code editor'}
            >
              {isCodeVisible ? (
                <FaRegEyeSlash className="w-4 h-4 text-gray-600" />
              ) : (
                <FaRegEye className="w-4 h-4 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Code Editor - with smooth transition */}
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            isCodeVisible ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
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
                readOnly: isLoading, // Prevent editing during execution
              }}
            />
          </div>
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
