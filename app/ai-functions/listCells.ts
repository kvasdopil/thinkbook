import { z } from "zod";
import type { AIFunctionMetadata, CellData } from "../../types/ai-functions";

// Zod schema for listCells parameters (empty object)
export const listCellsSchema = z.object({});

export const listCellsMetadata: AIFunctionMetadata = {
  name: "listCells",
  description: "Returns a snapshot of every cell in the current notebook",
  parameters: listCellsSchema,
};

// Frontend implementation (not executed on server)
export const listCellsImplementation = async (
  params: z.infer<typeof listCellsSchema>,
  getCellsData: () => CellData[]
): Promise<CellData[]> => {
  // Get all cells from the notebook
  const cells = getCellsData();

  // Return a snapshot of all cells with their current state
  return cells.map((cell) => ({
    id: cell.id,
    type: cell.type,
    text: cell.text,
    output: cell.output,
  }));
};
