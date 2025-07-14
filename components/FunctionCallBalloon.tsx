"use client";

import {
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaStop,
} from "react-icons/fa";
import type { AIFunctionCall } from "../types/ai-functions";

interface FunctionCallBalloonProps {
  functionCall: AIFunctionCall;
}

export default function FunctionCallBalloon({
  functionCall,
}: FunctionCallBalloonProps) {
  const { name, parameters, status, result, error } = functionCall;

  // Get status configuration
  const getStatusConfig = () => {
    switch (status) {
      case "in-progress":
        return {
          bgColor: "bg-blue-100 border-blue-300",
          textColor: "text-blue-800",
          icon: <FaSpinner className="w-4 h-4 animate-spin" />,
          label: "In Progress",
        };
      case "success":
        return {
          bgColor: "bg-green-100 border-green-300",
          textColor: "text-green-800",
          icon: <FaCheckCircle className="w-4 h-4" />,
          label: "Success",
        };
      case "failure":
        return {
          bgColor: "bg-red-100 border-red-300",
          textColor: "text-red-800",
          icon: <FaTimesCircle className="w-4 h-4" />,
          label: "Failed",
        };
      case "cancelled":
        return {
          bgColor: "bg-orange-100 border-orange-300",
          textColor: "text-orange-800",
          icon: <FaStop className="w-4 h-4" />,
          label: "Cancelled",
        };
      default:
        return {
          bgColor: "bg-gray-100 border-gray-300",
          textColor: "text-gray-800",
          icon: <FaSpinner className="w-4 h-4" />,
          label: "Unknown",
        };
    }
  };

  const statusConfig = getStatusConfig();

  // Helper function to safely convert result to string
  const formatResult = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
  };

  // Check if result exists and is not null/undefined
  const hasResult = result !== null && result !== undefined;

  return (
    <div className="flex justify-start">
      <div
        className={`max-w-[85%] sm:max-w-[80%] px-4 py-3 rounded-lg border-2 ${statusConfig.bgColor} ${statusConfig.textColor}`}
      >
        {/* Header with function name and status */}
        <div className="flex items-center space-x-2 mb-2">
          {statusConfig.icon}
          <span className="font-medium text-sm">{name}</span>
          <span className="text-xs opacity-75">{statusConfig.label}</span>
        </div>

        {/* Parameters */}
        {Object.keys(parameters).length > 0 && (
          <div className="mb-2">
            <div className="text-xs opacity-75 mb-1">Parameters:</div>
            <div className="text-sm font-mono bg-white/50 px-2 py-1 rounded">
              {JSON.stringify(parameters, null, 2)}
            </div>
          </div>
        )}

        {/* Result */}
        {status === "success" && hasResult && (
          <div>
            <div className="text-xs opacity-75 mb-1">Result:</div>
            <div className="text-sm font-mono bg-white/50 px-2 py-1 rounded">
              {formatResult(result)}
            </div>
          </div>
        )}

        {/* Error */}
        {status === "failure" && error && (
          <div>
            <div className="text-xs opacity-75 mb-1">Error:</div>
            <div className="text-sm font-mono bg-white/50 px-2 py-1 rounded">
              {error}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
