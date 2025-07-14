// Shared types for AI function calls
import { z } from "zod";

export interface AIFunctionMetadata {
  name: string;
  description: string;
  parameters: z.ZodSchema;
}

export interface AIFunctionCall {
  id: string;
  name: string;
  parameters: Record<string, unknown>;
  status: "in-progress" | "success" | "failure" | "cancelled";
  result?: unknown;
  error?: string;
}

export interface CellData {
  id: number;
  type: "code" | "markdown";
  text: string;
  output?: string;
}

export interface AIFunctionImplementation<T = unknown> {
  metadata: AIFunctionMetadata;
  implementation: (params: Record<string, unknown>) => Promise<T>;
}

export interface FunctionCallResult {
  success: boolean;
  data?: unknown;
  error?: string;
}
