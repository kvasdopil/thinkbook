'use client'

import { Editor } from '@monaco-editor/react'
import { useRef, useEffect } from 'react'
import {
  FaRegEye,
  FaRegEyeSlash,
  FaCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationCircle,
  FaTrash,
  FaPlayCircle,
} from 'react-icons/fa'
import type { CellData, CellOperations } from '../types/cell'
import { getTopLevelComment } from '../types/cell'
import TableDisplay from './TableDisplay'

interface CellProps {
  cell: CellData
  operations: CellOperations
  isWorkerReady: boolean
  isStopping: boolean
  sharedArrayBufferSupported: boolean
}

export default function Cell({
  cell,
  operations,
  isWorkerReady,
  isStopping,
  sharedArrayBufferSupported,
}: CellProps) {
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

  // Scroll to bottom when output changes
  useEffect(() => {
    scrollToBottomIfNeeded()
  }, [cell.output, cell.tables])

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || ''
    operations.updateCell(cell.id, { text: newCode })
  }

  const handleDeleteCell = () => {
    if (confirm('Are you sure you want to delete this cell?')) {
      operations.deleteCell(cell.id)
    }
  }

  const handleRunCell = () => {
    operations.runCell(cell.id)
  }

  const handleStopCell = () => {
    operations.stopCell(cell.id)
  }

  const handleToggleVisibility = () => {
    operations.toggleCellVisibility(cell.id)
  }

  // Get status button color and icon based on execution status
  const getStatusButtonProps = () => {
    const isRunning = cell.executionStatus === 'running'

    if (isRunning) {
      return {
        icon: FaCircle,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50 hover:bg-blue-100',
        title: 'Stop',
        action: handleStopCell,
        disabled: isStopping,
      }
    }

    switch (cell.executionStatus) {
      case 'complete':
        return {
          icon: FaCheckCircle,
          color: 'text-green-500',
          bgColor: 'bg-green-50 hover:bg-green-100',
          title: 'Run',
          action: handleRunCell,
          disabled: !isWorkerReady,
        }
      case 'failed':
        return {
          icon: FaTimesCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-50 hover:bg-red-100',
          title: 'Run',
          action: handleRunCell,
          disabled: !isWorkerReady,
        }
      case 'cancelled':
        return {
          icon: FaExclamationCircle,
          color: 'text-orange-500',
          bgColor: 'bg-orange-50 hover:bg-orange-100',
          title: 'Run',
          action: handleRunCell,
          disabled: !isWorkerReady,
        }
      default: // idle
        return {
          icon: FaPlayCircle,
          color: 'text-gray-400',
          bgColor: 'bg-gray-50 hover:bg-gray-100',
          title: 'Run',
          action: handleRunCell,
          disabled: !isWorkerReady,
        }
    }
  }

  const statusButtonProps = getStatusButtonProps()
  const StatusIcon = statusButtonProps.icon

  return (
    <div className="w-full border border-gray-300 rounded-lg overflow-hidden">
      <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-gray-700">
            {cell.isCodeVisible
              ? 'Python Editor'
              : getTopLevelComment(cell.text)}
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
            onClick={handleToggleVisibility}
            className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors"
            aria-label={
              cell.isCodeVisible ? 'Hide code editor' : 'Show code editor'
            }
            title={cell.isCodeVisible ? 'Hide code editor' : 'Show code editor'}
          >
            {cell.isCodeVisible ? (
              <FaRegEyeSlash className="w-4 h-4 text-gray-600" />
            ) : (
              <FaRegEye className="w-4 h-4 text-gray-600" />
            )}
          </button>

          {/* Delete Button */}
          <button
            onClick={handleDeleteCell}
            className="p-2 rounded-full bg-red-50 hover:bg-red-100 transition-colors"
            aria-label="Delete cell"
            title="Delete cell"
          >
            <FaTrash className="w-4 h-4 text-red-600" />
          </button>
        </div>
      </div>

      {/* Code Editor - with smooth transition */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          cell.isCodeVisible ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="h-64">
          <Editor
            height="100%"
            defaultLanguage="python"
            value={cell.text}
            onChange={handleCodeChange}
            theme="vs-light"
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 14,
              wordWrap: 'on',
              automaticLayout: true,
              readOnly: cell.executionStatus === 'running', // Prevent editing during execution
            }}
          />
        </div>
      </div>

      {/* Output Area */}
      <div className="border-t border-gray-300">
        <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex justify-between items-center">
          <h3 className="text-sm font-medium text-gray-700">Output</h3>
          {!sharedArrayBufferSupported && (
            <span className="text-xs text-orange-600 font-medium">
              ⚠️ SharedArrayBuffer not supported - cancellation unavailable
            </span>
          )}
        </div>
        <div
          ref={outputRef}
          className="p-4 bg-gray-50 min-h-32 max-h-96 overflow-y-auto"
        >
          {cell.output && (
            <pre className="text-sm font-mono whitespace-pre-wrap text-gray-800">
              {cell.output}
            </pre>
          )}
          {cell.tables.map((table, index) => (
            <TableDisplay key={index} table={table} />
          ))}
        </div>
      </div>
    </div>
  )
}
