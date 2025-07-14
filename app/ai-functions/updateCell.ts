import { z } from "zod";
import type { AIFunctionMetadata } from "../../types/ai-functions";

// Zod schema for updateCell parameters
export const updateCellSchema = z.object({
  id: z.number().describe("The ID of the cell to update"),
  text: z.string().describe("The new text content for the cell"),
});

export const updateCellMetadata: AIFunctionMetadata = {
  name: "updateCell",
  description: "Replaces the cell's contents with the new text",
  parameters: updateCellSchema,
};

export type UpdateCellParams = z.infer<typeof updateCellSchema>;

export interface UpdateCellResult {
  updated: true;
}

// Frontend implementation (not executed on server)
export const updateCellImplementation = async (
  params: UpdateCellParams,
  updateCellData: (id: number, text: string) => void
): Promise<UpdateCellResult> => {
  updateCellData(params.id, params.text);
  return { updated: true };
};
