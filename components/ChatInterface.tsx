"use client";

import { useRef, useEffect, useState } from "react";
import { useChat } from "ai/react";
import { FaPaperPlane, FaSpinner } from "react-icons/fa";
import FunctionCallBalloon from "./FunctionCallBalloon";
import {
  listCellsImplementation,
  listCellsSchema,
} from "../app/ai-functions/listCells";
import {
  updateCellImplementation,
  updateCellSchema,
} from "../app/ai-functions/updateCell";
import type { AIFunctionCall, CellData } from "../types/ai-functions";

interface ChatInterfaceProps {
  className?: string;
  cellData?: CellData;
  onCellUpdate?: (text: string) => void;
}

export default function ChatInterface({
  className = "",
  cellData,
  onCellUpdate,
}: ChatInterfaceProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [functionCalls, setFunctionCalls] = useState<
    Record<string, AIFunctionCall>
  >({});

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } =
    useChat({
      api: "/api/chat",
      initialMessages: [],
      onToolCall: async ({ toolCall }) => {
        const functionCall: AIFunctionCall = {
          id: toolCall.toolCallId,
          name: toolCall.toolName,
          parameters: toolCall.args as Record<string, unknown>,
          status: "in-progress",
        };

        setFunctionCalls((prev) => ({
          ...prev,
          [toolCall.toolCallId]: functionCall,
        }));

        try {
          let result;

          if (toolCall.toolName === "listCells") {
            // Validate parameters with Zod
            const validatedParams = listCellsSchema.parse(toolCall.args);
            result = await listCellsImplementation(validatedParams, () =>
              cellData ? [cellData] : []
            );
          } else if (toolCall.toolName === "updateCell") {
            // Validate parameters with Zod
            const validatedParams = updateCellSchema.parse(toolCall.args);
            result = await updateCellImplementation(
              validatedParams,
              (id: number, text: string) => {
                if (onCellUpdate && cellData?.id === id) {
                  onCellUpdate(text);
                }
              }
            );
          } else {
            throw new Error(`Unknown function: ${toolCall.toolName}`);
          }

          setFunctionCalls((prev) => ({
            ...prev,
            [toolCall.toolCallId]: {
              ...prev[toolCall.toolCallId],
              status: "success",
              result,
            },
          }));

          return result;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";

          setFunctionCalls((prev) => ({
            ...prev,
            [toolCall.toolCallId]: {
              ...prev[toolCall.toolCallId],
              status: "failure",
              error: errorMessage,
            },
          }));

          throw error;
        }
      },
    });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, functionCalls]);

  // Handle textarea auto-resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // Handle form submission
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      handleSubmit(e);
    }
  };

  // Handle keyboard shortcuts: Enter to send, Shift/Ctrl/Cmd + Enter to add newline
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        // Allow default newline insertion
        return;
      }

      // Send the message on plain Enter
      e.preventDefault();
      if (input.trim() && !isLoading) {
        handleSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  return (
    <div className={`border rounded-lg bg-white ${className}`}>
      {/* Chat History */}
      <div className="h-48 sm:h-64 overflow-y-auto p-3 sm:p-4 border-b bg-gray-50">
        {messages.length === 0 && Object.keys(functionCalls).length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            Ask me anything about your code or programming in general!
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div key={index} className="space-y-2">
                <div
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[80%] px-3 sm:px-4 py-2 rounded-lg ${
                      message.role === "user"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </div>
                  </div>
                </div>

                {/* Render function calls for this message */}
                {message.toolInvocations &&
                  message.toolInvocations.map((toolInvocation) => {
                    const functionCall =
                      functionCalls[toolInvocation.toolCallId];
                    return functionCall ? (
                      <FunctionCallBalloon
                        key={toolInvocation.toolCallId}
                        functionCall={functionCall}
                      />
                    ) : null;
                  })}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <FaSpinner className="animate-spin w-3 h-3" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 sm:p-4">
        {error && (
          <div className="mb-3 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
            {error.message || "An error occurred. Please try again."}
          </div>
        )}

        <form onSubmit={onSubmit} className="flex space-x-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about your code..."
            className="flex-1 min-h-[40px] max-h-32 px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
            rows={1}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            aria-label="Send message"
          >
            {isLoading ? (
              <FaSpinner className="animate-spin w-4 h-4" />
            ) : (
              <FaPaperPlane className="w-4 h-4" />
            )}
          </button>
        </form>

        <div className="mt-2 text-xs text-gray-500 hidden sm:block">
          Press Shift/⌘/Ctrl+Enter to insert a new line
        </div>
      </div>
    </div>
  );
}
