import { listCellsMetadata } from "./listCells";
import { updateCellMetadata } from "./updateCell";
import type { AIFunctionMetadata } from "../../types/ai-functions";

// Registry of all available AI functions
export const AI_FUNCTIONS: Record<string, AIFunctionMetadata> = {
  listCells: listCellsMetadata,
  updateCell: updateCellMetadata,
};

// Get all function metadata for the AI model
export function getAllFunctionMetadata(): AIFunctionMetadata[] {
  return Object.values(AI_FUNCTIONS);
}

// Get specific function metadata by name
export function getFunctionMetadata(
  name: string
): AIFunctionMetadata | undefined {
  return AI_FUNCTIONS[name];
}
