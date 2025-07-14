"use client";

import { useState } from "react";
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
} from "react-icons/fa";
import ChatInterface from "./ChatInterface";
import type { CellData } from "../types/ai-functions";

export enum ExecutionState {
  NEW = "new",
  RUNNING = "running",
  COMPLETE = "complete",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

interface CodeCellProps {
  code: string;
  onChange: (code: string) => void;
  onRun: () => void;
  onStop: () => void;
  executionState: ExecutionState;
  disabled?: boolean;
  isInitialized?: boolean;
  output?: string;
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
  executionState,
  disabled = false,
  isInitialized = false,
  output,
}: CodeCellProps) {
  const [isCodeVisible, setIsCodeVisible] = useState(false); // Default: hidden
  const [isStatusHovered, setIsStatusHovered] = useState(false);

  const topLevelComment = extractTopLevelComment(code);
  const statusConfig = getStatusConfig(executionState, isStatusHovered);

  const canRun =
    isInitialized && executionState !== ExecutionState.RUNNING && !disabled;
  const canStop = executionState === ExecutionState.RUNNING && !disabled;

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

  // Create cell data for function calls
  const cellData: CellData = {
    id: 0, // For MVP, we have exactly one cell
    type: "code",
    text: code,
    output: output,
  };

  // Handle cell updates from AI function calls
  const handleCellUpdate = (newText: string) => {
    onChange(newText);
  };

  return (
    <div className="space-y-4">
      {/* Chat Interface */}
      <ChatInterface cellData={cellData} onCellUpdate={handleCellUpdate} />

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

          {/* Toggle Button */}
          <button
            onClick={toggleCodeVisibility}
            className="ml-3 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
            aria-label={`${isCodeVisible ? "Hide" : "Show"} code editor`}
          >
            {isCodeVisible ? (
              <FaRegEyeSlash className="w-4 h-4" />
            ) : (
              <FaRegEye className="w-4 h-4" />
            )}
          </button>
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
                readOnly: disabled,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
