import { z } from 'zod';

export const listCellsToolName = 'listCells' as const;

export const listCellsSchema = z.object({});

export type ListCellsArgs = z.infer<typeof listCellsSchema>;

// Metadata only: used by the backend to register tools
export const listCellsSpec = {
  description: 'Get a snapshot of all notebook cells with id, type, text, status, and output lines',
  parameters: listCellsSchema,
};
