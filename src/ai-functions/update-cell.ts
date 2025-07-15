import { z } from 'zod'

// Schema for updateCell function parameters
export const updateCellParameters = z.object({
  id: z.string().describe('The ID of the cell to update'),
  text: z.string().describe('The new text content for the cell'),
})

export type UpdateCellParams = z.infer<typeof updateCellParameters>

export const updateCellMetadata = {
  name: 'updateCell',
  description: 'Replace the contents of a specific notebook cell with new text',
  parameters: updateCellParameters,
}

export interface UpdateCellResult {
  success: true
}

export interface UpdateCellDependencies {
  onCellCodeChange?: (code: string) => void
  currentCellId: string
}

// Function implementation (used on frontend)
export async function executeUpdateCell(
  params: UpdateCellParams,
  dependencies: UpdateCellDependencies
): Promise<UpdateCellResult> {
  const { id, text } = params
  const { onCellCodeChange, currentCellId } = dependencies

  // Validate the cell ID exists
  if (id !== currentCellId) {
    throw new Error(`Cell with ID "${id}" not found`)
  }

  // Update the cell content using the provided callback
  if (onCellCodeChange) {
    onCellCodeChange(text)
    return {
      success: true,
    }
  } else {
    throw new Error(`Cannot update cell "${id}" - no update handler available`)
  }
}
