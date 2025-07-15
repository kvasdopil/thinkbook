import { z } from 'zod'

// Schema for createCodeCell function parameters
export const createCodeCellParameters = z.object({
  text: z.string().describe('The full source code for the new cell'),
})

export type CreateCodeCellParams = z.infer<typeof createCodeCellParameters>

export const createCodeCellMetadata = {
  name: 'createCodeCell',
  description:
    'Create a new code cell with the specified source code and insert it after the current message',
  parameters: createCodeCellParameters,
}

export interface CreateCodeCellResult {
  success: true
}

export interface CreateCodeCellDependencies {
  onCreateCell?: (text: string) => void
  currentMessageId: string
}

// Function implementation (used on frontend)
export async function executeCreateCodeCell(
  params: CreateCodeCellParams,
  dependencies: CreateCodeCellDependencies
): Promise<CreateCodeCellResult> {
  const { text } = params
  const { onCreateCell } = dependencies

  // Create the new cell using the provided callback
  if (onCreateCell) {
    onCreateCell(text)
    return {
      success: true,
    }
  } else {
    throw new Error('Cannot create cell - no creation handler available')
  }
}
