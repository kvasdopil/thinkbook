'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useChat } from 'ai/react'
import type { CellData, CellOperations } from '@/types/cell'
import { createNewCell } from '@/types/cell'
import { ConversationItem } from '@/types/conversation'
import type { PyodideResponse } from '@/types/worker'
import ConversationList from '@/components/ConversationList'
import FixedChatInput from '@/components/FixedChatInput'
import { executeUpdateCell } from '@/ai-functions/update-cell'
import { executeCreateCodeCell } from '@/ai-functions/create-code-cell'
import type { UpdateCellParams, CreateCodeCellParams } from '@/ai-functions'

export default function Home() {
  // Cells state - only store cells, not messages
  const [cells, setCells] = useState<CellData[]>(() => [
    createNewCell('cell-1'),
  ])

  const [isWorkerReady, setIsWorkerReady] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const [sharedArrayBufferSupported, setSharedArrayBufferSupported] =
    useState(false)

  const workerRef = useRef<Worker | null>(null)
  const interruptBufferRef = useRef<SharedArrayBuffer | null>(null)
  const runningCellRef = useRef<string | null>(null)

  // AI Chat integration
  const { status, messages, input, setInput, handleSubmit, isLoading } =
    useChat({
      api: '/api/chat',
      maxSteps: 5,
      async onToolCall({ toolCall }) {
        try {
          let result: unknown

          if (toolCall.toolName === 'listCells') {
            // Get current cells
            result = cells.map((cell) => ({
              id: cell.id,
              type: 'code',
              text: cell.text,
              output: cell.output || '',
            }))
          } else if (toolCall.toolName === 'updateCell') {
            const params = toolCall.args as UpdateCellParams
            result = await executeUpdateCell(params, {
              onCellCodeChange: (text: string) => {
                setCells((prev) =>
                  prev.map((cell) =>
                    cell.id === params.id ? { ...cell, text } : cell
                  )
                )
              },
              currentCellId: params.id,
            })
          } else if (toolCall.toolName === 'createCodeCell') {
            const params = toolCall.args as CreateCodeCellParams
            result = await executeCreateCodeCell(params, {
              onCreateCell: (text: string) => {
                const newId = `cell-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                // Use the toolCallId as the parentId to link the cell to this tool call
                const newCell = createNewCell(newId, toolCall.toolCallId)
                newCell.text = text
                setCells((prev) => [...prev, newCell])
              },
              currentMessageId: toolCall.toolCallId,
            })
          } else {
            throw new Error(`Unknown function: ${toolCall.toolName}`)
          }

          return result
        } catch (error) {
          throw error
        }
      },
    })

  // Derived conversation items - combine live messages with cells
  const conversationItems: ConversationItem[] = useMemo(() => {
    const items: ConversationItem[] = []

    // If no messages, show all cells in order
    if (messages.length === 0) {
      cells.forEach((cell, index) => {
        items.push({
          type: 'cell',
          data: cell,
          timestamp: index,
        })
      })
      return items
    }

    // Add unlinked cells first (parentId = null)
    const unlinkedCells = cells.filter((cell) => cell.parentId === null)
    unlinkedCells.forEach((cell, index) => {
      items.push({
        type: 'cell',
        data: cell,
        timestamp: -100 + index, // Before all messages
      })
    })

    // Add messages and their linked cells in chronological order
    messages.forEach((message, messageIndex) => {
      // Add the message
      items.push({
        type: 'message',
        data: message,
        timestamp: messageIndex * 10,
      })

      // Add cells linked to this message immediately after it
      const linkedCells = cells.filter((cell) => cell.parentId === message.id)
      linkedCells.forEach((cell, cellIndex) => {
        items.push({
          type: 'cell',
          data: cell,
          timestamp: messageIndex * 10 + cellIndex + 1,
        })
      })

      // Add cells created by tool calls within this message
      if (message.parts) {
        message.parts.forEach((part) => {
          if (part.type === 'tool-invocation') {
            const toolCallId = part.toolInvocation.toolCallId
            const toolCreatedCells = cells.filter(
              (cell) => cell.parentId === toolCallId
            )
            toolCreatedCells.forEach((cell, cellIndex) => {
              items.push({
                type: 'cell',
                data: cell,
                timestamp: messageIndex * 10 + cellIndex + 5, // After regular linked cells
              })
            })
          }
        })
      }
    })

    return items
  }, [messages, cells])

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
      const { type, error, output: streamOutput } = event.data

      switch (type) {
        case 'init-complete':
          setIsWorkerReady(true)
          const initOutput = 'Python environment ready! 🐍'

          // Update all cells with initial output
          setCells((prev) =>
            prev.map((cell) => ({ ...cell, output: initOutput }))
          )
          break

        case 'output':
          if (streamOutput && runningCellRef.current) {
            const runningCellId = runningCellRef.current
            setCells((prev) =>
              prev.map((cell) =>
                cell.id === runningCellId
                  ? {
                      ...cell,
                      output:
                        cell.output +
                        (streamOutput.type === 'err' ? '[ERROR] ' : '') +
                        streamOutput.value,
                    }
                  : cell
              )
            )
          }
          break

        case 'result':
          if (runningCellRef.current) {
            const runningCellId = runningCellRef.current
            setCells((prev) =>
              prev.map((cell) =>
                cell.id === runningCellId
                  ? { ...cell, executionStatus: 'complete' }
                  : cell
              )
            )
            runningCellRef.current = null
            setIsStopping(false)
          }
          break

        case 'error':
          if (runningCellRef.current) {
            const runningCellId = runningCellRef.current
            setCells((prev) =>
              prev.map((cell) =>
                cell.id === runningCellId
                  ? {
                      ...cell,
                      executionStatus: 'failed',
                      output: cell.output + `\n[ERROR] ${error}`,
                    }
                  : cell
              )
            )
            runningCellRef.current = null
            setIsStopping(false)
          }
          break

        case 'execution-cancelled':
          if (runningCellRef.current) {
            const runningCellId = runningCellRef.current
            setCells((prev) =>
              prev.map((cell) =>
                cell.id === runningCellId
                  ? {
                      ...cell,
                      executionStatus: 'cancelled',
                      output: cell.output + '\n[CANCELLED] Execution stopped',
                    }
                  : cell
              )
            )
            runningCellRef.current = null
            setIsStopping(false)
          }
          break

        case 'interrupt-buffer-set':
          break

        default:
          console.warn('[Main] Unknown message type:', type)
      }
    }

    worker.onerror = () => {
      setIsWorkerReady(false)
    }

    // Initialize the worker
    worker.postMessage({ type: 'init' })

    // Set up SharedArrayBuffer for interruption if supported
    if (hasSharedArrayBuffer) {
      const buffer = new SharedArrayBuffer(1)
      interruptBufferRef.current = buffer
      worker.postMessage({ type: 'setInterruptBuffer', buffer })
    }

    return () => {
      worker.terminate()
    }
  }, [])

  // Cell operations
  const cellOperations: CellOperations = {
    updateCell: (id: string, updates: Partial<CellData>) => {
      setCells((prev) =>
        prev.map((cell) => (cell.id === id ? { ...cell, ...updates } : cell))
      )
    },

    runCell: (id: string) => {
      if (!isWorkerReady || runningCellRef.current) return

      const cell = cells.find((c) => c.id === id)
      if (!cell) return

      runningCellRef.current = id
      setCells((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, executionStatus: 'running', output: '' } : c
        )
      )

      workerRef.current?.postMessage({ type: 'execute', code: cell.text })
    },

    stopCell: (id: string) => {
      if (runningCellRef.current === id && interruptBufferRef.current) {
        setIsStopping(true)
        const buffer = new Uint8Array(interruptBufferRef.current)
        buffer[0] = 2 // SIGINT
      }
    },

    deleteCell: (id: string) => {
      setCells((prev) => prev.filter((cell) => cell.id !== id))
    },

    addCell: () => {
      const newId = `cell-${Date.now()}`
      // Link new cell to the last message (if any)
      const lastMessageId =
        messages.length > 0 ? messages[messages.length - 1].id : null
      const newCell = createNewCell(newId, lastMessageId)
      setCells((prev) => [...prev, newCell])
    },

    runAllCells: () => {
      const isAnyRunning = cells.some((c) => c.executionStatus === 'running')

      if (!workerRef.current || !isWorkerReady || isAnyRunning) {
        return
      }

      // Run cells sequentially
      const runNextCell = (index: number) => {
        if (index >= cells.length) return

        const cell = cells[index]
        cellOperations.runCell(cell.id)

        // Wait for completion before running next cell
        const checkCompletion = () => {
          const updatedCells = cells
          const currentCell = updatedCells.find((c) => c.id === cell.id)

          if (currentCell && currentCell.executionStatus !== 'running') {
            setTimeout(() => runNextCell(index + 1), 100)
          } else {
            setTimeout(checkCompletion, 100)
          }
        }

        setTimeout(checkCompletion, 100)
      }

      runNextCell(0)
    },

    toggleCellVisibility: (id: string) => {
      setCells((prev) =>
        prev.map((cell) =>
          cell.id === id
            ? { ...cell, isCodeVisible: !cell.isCodeVisible }
            : cell
        )
      )
    },
  }

  // Handle form submission
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSubmit(e)
  }

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      if (input.trim()) {
        onSubmit(e as React.FormEvent)
      }
    }
  }

  return (
    <main className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-300">
        <div className="container mx-auto max-w-4xl px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            🐍 Python Notebook with AI Assistant
          </h1>
        </div>
      </div>

      {/* Unified Conversation View */}
      <ConversationList
        items={conversationItems}
        cellOperations={cellOperations}
        isWorkerReady={isWorkerReady}
        isStopping={isStopping}
        sharedArrayBufferSupported={sharedArrayBufferSupported}
        isLoading={isLoading}
      />
      {status}

      {/* Fixed Chat Input */}
      <FixedChatInput
        input={input}
        isLoading={isLoading}
        onInputChange={handleInputChange}
        onSubmit={onSubmit}
        onKeyDown={handleKeyDown}
        onAddCell={cellOperations.addCell}
      />

      {/* Bottom padding to account for fixed input */}
      <div className="h-24" />
    </main>
  )
}
