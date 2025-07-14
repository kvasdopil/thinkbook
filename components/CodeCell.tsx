"use client";

import { useState, useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import {
  FaRegEye,
  FaRegEyeSlash,
  FaPlay,
  FaStop,
  FaCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaTrash,
} from "react-icons/fa";

export enum ExecutionState {
  NEW = "new",
  RUNNING = "running",
  COMPLETE = "complete",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

interface OutputLine {
  type: "out" | "err" | "system";
  value: string;
  timestamp: number;
}

interface CodeCellProps {
  code: string;
  onChange: (code: string) => void;
  onRun: () => void;
  onStop: () => void;
  onDelete: () => void;
  executionState: ExecutionState;
  output?: OutputLine[];
  disabled?: boolean;
  isInitialized?: boolean;
  canDelete?: boolean;
}

// Extract top-level comment from Python code
function extractTopLevelComment(code: string): string {
  const lines = code.split("\n");
  let comment = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) {
      // Remove the # and any following whitespace
      comment += trimmed.substring(1).trim();
      if (comment) break; // Stop at first non-empty comment
    } else if (trimmed && !trimmed.startsWith("#")) {
      // Stop at first non-comment, non-empty line
      break;
    }
  }

  return comment || "Python code cell";
}

// Get status button configuration based on execution state
function getStatusConfig(state: ExecutionState, isHovered: boolean) {
  switch (state) {
    case ExecutionState.NEW:
      return {
        icon: <FaCircle className="w-4 h-4" />,
        color: "text-gray-400",
        bgColor: "bg-gray-100",
        hoverText: isHovered ? "Run" : "New",
        showPlayIcon: isHovered,
      };
    case ExecutionState.RUNNING:
      return {
        icon: <FaSpinner className="w-4 h-4 animate-spin" />,
        color: "text-blue-500",
        bgColor: "bg-blue-100",
        hoverText: isHovered ? "Stop" : "Running",
        showStopIcon: isHovered,
      };
    case ExecutionState.COMPLETE:
      return {
        icon: <FaCheckCircle className="w-4 h-4" />,
        color: "text-green-500",
        bgColor: "bg-green-100",
        hoverText: isHovered ? "Run" : "Complete",
        showPlayIcon: isHovered,
      };
    case ExecutionState.FAILED:
      return {
        icon: <FaTimesCircle className="w-4 h-4" />,
        color: "text-red-500",
        bgColor: "bg-red-100",
        hoverText: isHovered ? "Run" : "Failed",
        showPlayIcon: isHovered,
      };
    case ExecutionState.CANCELLED:
      return {
        icon: <FaTimesCircle className="w-4 h-4" />,
        color: "text-orange-500",
        bgColor: "bg-orange-100",
        hoverText: isHovered ? "Run" : "Cancelled",
        showPlayIcon: isHovered,
      };
    default:
      return {
        icon: <FaCircle className="w-4 h-4" />,
        color: "text-gray-400",
        bgColor: "bg-gray-100",
        hoverText: "New",
        showPlayIcon: false,
      };
  }
}

export default function CodeCell({
  code,
  onChange,
  onRun,
  onStop,
  onDelete,
  executionState,
  output,
  disabled = false,
  isInitialized = false,
  canDelete = true,
}: CodeCellProps) {
  const [isCodeVisible, setIsCodeVisible] = useState(false); // Default: hidden
  const [isStatusHovered, setIsStatusHovered] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const outputRef = useRef<HTMLPreElement>(null);

  const topLevelComment = extractTopLevelComment(code);
  const statusConfig = getStatusConfig(executionState, isStatusHovered);

  const canRun =
    isInitialized && executionState !== ExecutionState.RUNNING && !disabled;
  const canStop = executionState === ExecutionState.RUNNING && !disabled;

  // Auto-scroll to bottom when output changes
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const handleStatusClick = () => {
    if (canStop) {
      onStop();
    } else if (canRun) {
      onRun();
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    onChange(value || "");
  };

  const toggleCodeVisibility = () => {
    setIsCodeVisible(!isCodeVisible);
  };

  const handleDeleteClick = () => {
    if (canDelete) {
      setShowDeleteConfirm(true);
    }
  };

  const handleDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    onDelete();
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  // Format output for display
  const formatOutput = (output: OutputLine[]) => {
    return output.map((line, index) => {
      let className = "text-green-400"; // Default stdout color

      if (line.type === "err") {
        className = "text-red-400"; // Error color
      } else if (line.type === "system") {
        className = "text-blue-400"; // System color
      }

      return (
        <span key={index} className={className}>
          {line.value}
          {index < output.length - 1 && "\n"}
        </span>
      );
    });
  };

  return (
    <div className="space-y-4">
      {/* Chat Interface */}
      {/* Removed ChatInterface component */}

      {/* Code Cell */}
      <div className="border rounded-lg overflow-hidden">
        {/* Header with comment and controls */}
        <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {/* Status Button */}
            <button
              onClick={handleStatusClick}
              onMouseEnter={() => setIsStatusHovered(true)}
              onMouseLeave={() => setIsStatusHovered(false)}
              disabled={!canRun && !canStop}
              className={`
              flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium
              transition-all duration-200 min-w-0
              ${statusConfig.bgColor} ${statusConfig.color}
              ${
                canRun || canStop
                  ? "hover:shadow-md cursor-pointer"
                  : "cursor-default"
              }
              ${!canRun && !canStop ? "opacity-50" : ""}
            `}
              aria-label={`${statusConfig.hoverText} code cell`}
            >
              {statusConfig.showPlayIcon && canRun ? (
                <FaPlay className="w-3 h-3" />
              ) : statusConfig.showStopIcon && canStop ? (
                <FaStop className="w-3 h-3" />
              ) : (
                statusConfig.icon
              )}
              <span className="truncate">{statusConfig.hoverText}</span>
            </button>

            {/* Top-level comment */}
            <div className="text-gray-700 text-sm truncate flex-1">
              {topLevelComment}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-2">
            {/* Delete Button */}
            {canDelete && (
              <div className="relative">
                <button
                  onClick={handleDeleteClick}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  aria-label="Delete cell"
                  aria-describedby="delete-help"
                >
                  <FaTrash className="w-4 h-4" />
                </button>

                {/* Delete Confirmation Dialog */}
                {showDeleteConfirm && (
                  <div
                    className="absolute right-0 top-full mt-2 bg-white border rounded-lg shadow-lg p-3 z-10 min-w-48"
                    role="dialog"
                    aria-labelledby="delete-dialog-title"
                    aria-describedby="delete-dialog-description"
                  >
                    <div
                      id="delete-dialog-title"
                      className="text-sm font-medium text-gray-900 mb-2"
                    >
                      Delete Cell
                    </div>
                    <div
                      id="delete-dialog-description"
                      className="text-sm text-gray-700 mb-3"
                    >
                      Are you sure you want to delete this cell? This action
                      cannot be undone.
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={handleDeleteCancel}
                        className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 rounded"
                        aria-label="Cancel deletion"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteConfirm}
                        className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        aria-label="Confirm deletion"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Toggle Button */}
            <button
              onClick={toggleCodeVisibility}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
              aria-label={`${isCodeVisible ? "Hide" : "Show"} code editor`}
            >
              {isCodeVisible ? (
                <FaRegEyeSlash className="w-4 h-4" />
              ) : (
                <FaRegEye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Code Editor (collapsible) */}
        <div
          className={`
        transition-all duration-300 ease-in-out overflow-hidden
        ${isCodeVisible ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}
      `}
        >
          <div className="h-64">
            <Editor
              height="100%"
              defaultLanguage="python"
              value={code}
              onChange={handleEditorChange}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                insertSpaces: true,
                readOnly: disabled || executionState === ExecutionState.RUNNING,
              }}
            />
          </div>
        </div>

        {/* Output Section */}
        {output &&
          output.filter((line) => line.type !== "system").length > 0 && (
            <div className="border-t">
              <div className="bg-gray-100 px-4 py-2 border-b">
                <h3 className="text-sm font-semibold text-gray-700">Output</h3>
              </div>
              <div className="p-4">
                <pre
                  ref={outputRef}
                  className="bg-black text-green-400 p-4 rounded font-mono text-sm overflow-auto max-h-64 whitespace-pre-wrap"
                  role="log"
                  aria-live="polite"
                  aria-label="Cell execution output"
                  tabIndex={0}
                >
                  {formatOutput(
                    output.filter((line) => line.type !== "system")
                  )}
                </pre>
              </div>
            </div>
          )}

        {/* Screen reader help text */}
        <div className="sr-only">
          <div id="delete-help">
            Permanently removes this cell from the notebook. This action cannot
            be undone.
          </div>
        </div>
      </div>
    </div>
  );
}
