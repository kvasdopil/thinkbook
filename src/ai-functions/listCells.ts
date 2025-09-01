import { z } from 'zod';

// Schema for listCells function - no parameters needed
export const listCellsParameters = z.object({});

export interface CellData {
  id: string;
  type: 'code' | 'markdown';
  text: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  output: string[];
}

export async function listCells(): Promise<CellData[]> {
  // Placeholder implementation - return mock data for testing
  return [
    {
      id: 'cell-1',
      type: 'code',
      text: 'print("Hello, World!")',
      status: 'completed',
      output: ['Hello, World!']
    },
    {
      id: 'cell-2', 
      type: 'markdown',
      text: '# Sample Notebook\n\nThis is a test notebook with some sample cells.',
      status: 'idle',
      output: []
    },
    {
      id: 'cell-3',
      type: 'code', 
      text: 'x = 42\nprint(f"The answer is {x}")',
      status: 'completed',
      output: ['The answer is 42']
    }
  ];
}