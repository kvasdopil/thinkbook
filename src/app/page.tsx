'use client'

import { useState, useRef, useEffect } from 'react'
import { FaPlay, FaPlus } from 'react-icons/fa'
import Cell from '@/components/Cell'
import Chat from '@/components/Chat'
import type { CellData, CellOperations, CellManager } from '@/types/cell'
import { createNewCell } from '@/types/cell'
import type { PyodideMessage, PyodideResponse } from '@/types/worker'

export default function Home() {
  const [cellManager, setCellManager] = useState<CellManager>(() => ({
    cells: [createNewCell('cell-1')],
    isAnyRunning: false,
    runningCellIds: new Set(),
  }))

  const [isWorkerReady, setIsWorkerReady] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const [sharedArrayBufferSupported, setSharedArrayBufferSupported] =
    useState(false)

  const workerRef = useRef<Worker | null>(null)
  const interruptBufferRef = useRef<SharedArrayBuffer | null>(null)
  const runningCellRef = useRef<string | null>(null)

  // Initialize worker
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
      console.log('[Main] Received message from worker:', event.data)
      const { type, error, output: streamOutput } = event.data

      switch (type) {
        case 'init-complete':
          setIsWorkerReady(true)
          const initOutput = 'Python environment ready! 🐍'

          // Update all cells with initial output
          setCellManager((prev) => ({
            ...prev,
            cells: prev.cells.map((cell) => ({ ...cell, output: initOutput })),
          }))

          // Set up interrupt buffer if SharedArrayBuffer is supported
          if (hasSharedArrayBuffer) {
            const buffer = new SharedArrayBuffer(1) // 1 byte for interrupt signal
            interruptBufferRef.current = buffer
            const setBufferMessage: PyodideMessage = {
              type: 'setInterruptBuffer',
              buffer,
            }
            console.log('[Main] Sending message to worker:', setBufferMessage)
            worker.postMessage(setBufferMessage)
          }
          break
        case 'interrupt-buffer-set':
          // Buffer successfully set up
          break
        case 'output':
          if (streamOutput && runningCellRef.current) {
            const cellId = runningCellRef.current
            setCellManager((prev) => ({
              ...prev,
              cells: prev.cells.map((cell) =>
                cell.id === cellId
                  ? { ...cell, output: cell.output + streamOutput.value }
                  : cell
              ),
            }))
          }
          break
        case 'result':
          // Execution completed successfully
          if (runningCellRef.current) {
            const cellId = runningCellRef.current
            setCellManager((prev) => ({
              ...prev,
              cells: prev.cells.map((cell) =>
                cell.id === cellId
                  ? { ...cell, executionStatus: 'complete' }
                  : cell
              ),
              isAnyRunning: false,
              runningCellIds: new Set(),
            }))
            runningCellRef.current = null
          }
          setIsStopping(false)
          break
        case 'execution-cancelled':
          if (runningCellRef.current) {
            const cellId = runningCellRef.current
            setCellManager((prev) => ({
              ...prev,
              cells: prev.cells.map((cell) =>
                cell.id === cellId
                  ? {
                      ...cell,
                      output: cell.output + '\nExecution interrupted by user\n',
                      executionStatus: 'cancelled',
                    }
                  : cell
              ),
              isAnyRunning: false,
              runningCellIds: new Set(),
            }))
            runningCellRef.current = null
          }
          setIsStopping(false)
          break
        case 'shared-array-buffer-unavailable':
          if (runningCellRef.current) {
            const cellId = runningCellRef.current
            setCellManager((prev) => ({
              ...prev,
              cells: prev.cells.map((cell) =>
                cell.id === cellId
                  ? {
                      ...cell,
                      output:
                        cell.output +
                        '\nError: SharedArrayBuffer not supported. Cancellation unavailable.\n',
                      executionStatus: 'failed',
                    }
                  : cell
              ),
              isAnyRunning: false,
              runningCellIds: new Set(),
            }))
            runningCellRef.current = null
          }
          setIsStopping(false)
          break
        case 'error':
          if (runningCellRef.current) {
            const cellId = runningCellRef.current
            setCellManager((prev) => ({
              ...prev,
              cells: prev.cells.map((cell) =>
                cell.id === cellId
                  ? {
                      ...cell,
                      output: cell.output + `\nError: ${error}`,
                      executionStatus: 'failed',
                    }
                  : cell
              ),
              isAnyRunning: false,
              runningCellIds: new Set(),
            }))
            runningCellRef.current = null
          }
          setIsStopping(false)
          break
      }
    }

    worker.onerror = (error) => {
      console.log('[Main] Worker error:', error)
      if (runningCellRef.current) {
        const cellId = runningCellRef.current
        setCellManager((prev) => ({
          ...prev,
          cells: prev.cells.map((cell) =>
            cell.id === cellId
              ? {
                  ...cell,
                  output: cell.output + `\nWorker error: ${error.message}`,
                  executionStatus: 'failed',
                }
              : cell
          ),
          isAnyRunning: false,
          runningCellIds: new Set(),
        }))
        runningCellRef.current = null
      }
      setIsStopping(false)
    }

    // Initialize Pyodide
    const initMessage: PyodideMessage = { type: 'init' }
    console.log('[Main] Sending message to worker:', initMessage)
    worker.postMessage(initMessage)

    return () => {
      worker.terminate()
    }
  }, [])

  // Cell operations
  const cellOperations: CellOperations = {
    updateCell: (id: string, updates: Partial<CellData>) => {
      setCellManager((prev) => ({
        ...prev,
        cells: prev.cells.map((cell) =>
          cell.id === id ? { ...cell, ...updates } : cell
        ),
      }))
    },

    deleteCell: (id: string) => {
      setCellManager((prev) => ({
        ...prev,
        cells: prev.cells.filter((cell) => cell.id !== id),
      }))
    },

    addCell: () => {
      const newCell = createNewCell()
      setCellManager((prev) => ({
        ...prev,
        cells: [...prev.cells, newCell],
      }))
    },

    runCell: (id: string) => {
      const cell = cellManager.cells.find((c) => c.id === id)
      if (
        !cell ||
        !workerRef.current ||
        !isWorkerReady ||
        cellManager.isAnyRunning
      ) {
        return
      }

      // Clear output and set running status
      setCellManager((prev) => ({
        ...prev,
        cells: prev.cells.map((c) =>
          c.id === id ? { ...c, output: '', executionStatus: 'running' } : c
        ),
        isAnyRunning: true,
        runningCellIds: new Set([id]),
      }))

      runningCellRef.current = id
      setIsStopping(false)

      const executeMessage: PyodideMessage = {
        type: 'execute',
        code: cell.text,
      }
      console.log('[Main] Sending message to worker:', {
        ...executeMessage,
        code: executeMessage.code
          ? executeMessage.code.slice(0, 100) +
            (executeMessage.code.length > 100 ? '...' : '')
          : 'undefined',
      })
      workerRef.current.postMessage(executeMessage)
    },

    stopCell: (id: string) => {
      if (!sharedArrayBufferSupported) {
        setCellManager((prev) => ({
          ...prev,
          cells: prev.cells.map((cell) =>
            cell.id === id
              ? {
                  ...cell,
                  output:
                    cell.output +
                    '\nError: SharedArrayBuffer not supported. Cancellation unavailable.\n',
                }
              : cell
          ),
        }))
        return
      }

      if (!interruptBufferRef.current) {
        setCellManager((prev) => ({
          ...prev,
          cells: prev.cells.map((cell) =>
            cell.id === id
              ? {
                  ...cell,
                  output:
                    cell.output +
                    '\nError: Interrupt buffer not initialized. Cancellation unavailable.\n',
                }
              : cell
          ),
        }))
        return
      }

      setIsStopping(true)

      // Set interrupt signal: buffer[0] = 2 triggers SIGINT in Pyodide
      const view = new Uint8Array(interruptBufferRef.current)
      view[0] = 2
      console.log(
        '[Main] Set interrupt signal in SharedArrayBuffer: buffer[0] = 2'
      )
    },

    runAllCells: () => {
      if (cellManager.isAnyRunning || !isWorkerReady) {
        return
      }

      // Run cells sequentially
      let currentIndex = 0
      const runNext = () => {
        if (currentIndex >= cellManager.cells.length) {
          return
        }

        const cell = cellManager.cells[currentIndex]
        cellOperations.runCell(cell.id)

        // Wait for current execution to complete before running next
        const checkCompletion = () => {
          const updatedManager = cellManager
          const currentCell = updatedManager.cells.find((c) => c.id === cell.id)
          if (currentCell && currentCell.executionStatus !== 'running') {
            currentIndex++
            setTimeout(runNext, 100) // Small delay before running next cell
          } else {
            setTimeout(checkCompletion, 100)
          }
        }

        setTimeout(checkCompletion, 100)
      }

      runNext()
    },

    toggleCellVisibility: (id: string) => {
      setCellManager((prev) => ({
        ...prev,
        cells: prev.cells.map((cell) =>
          cell.id === id
            ? { ...cell, isCodeVisible: !cell.isCodeVisible }
            : cell
        ),
      }))
    },
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          Jupyter Engine - Python in Browser
        </h1>

        {/* Single AI Chat Interface */}
        <div className="w-full max-w-4xl mx-auto mb-8">
          <Chat
            cells={cellManager.cells}
            onCellUpdate={cellOperations.updateCell}
          />
        </div>

        {/* Cell Controls */}
        <div className="w-full max-w-4xl mx-auto mb-6">
          <div className="flex gap-4 justify-center">
            <button
              onClick={cellOperations.runAllCells}
              disabled={cellManager.isAnyRunning || !isWorkerReady}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                cellManager.isAnyRunning || !isWorkerReady
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer'
              }`}
              aria-label="Run all cells"
            >
              <FaPlay className="w-4 h-4" />
              Run All
            </button>

            <button
              onClick={cellOperations.addCell}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-green-500 text-white hover:bg-green-600 transition-colors"
              aria-label="Add new cell"
            >
              <FaPlus className="w-4 h-4" />
              Add Cell
            </button>
          </div>
        </div>

        {/* Cell List */}
        <div className="w-full max-w-4xl mx-auto space-y-4">
          {cellManager.cells.map((cell) => (
            <Cell
              key={cell.id}
              cell={cell}
              operations={cellOperations}
              isWorkerReady={isWorkerReady}
              isStopping={isStopping}
              sharedArrayBufferSupported={sharedArrayBufferSupported}
            />
          ))}
        </div>
      </div>
    </main>
  )
}
