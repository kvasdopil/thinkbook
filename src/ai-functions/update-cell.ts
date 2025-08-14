import { z } from 'zod';

export const updateCellToolName = 'updateCell' as const;

export const updateCellSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
});

export type UpdateCellArgs = z.infer<typeof updateCellSchema>;

// Metadata only: used by the backend to register tools
export const updateCellSpec = {
  description: 'Replace the text of a notebook cell identified by id',
  parameters: updateCellSchema,
};
