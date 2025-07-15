/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from '@testing-library/react'
import Chat from '../components/Chat'
import { useChat } from 'ai/react'
import type { CellData } from '@/types/cell'

// Mock the useChat hook
jest.mock('ai/react', () => ({
  useChat: jest.fn(),
}))

// Mock the AI functions
jest.mock('../ai-functions/update-cell', () => ({
  executeUpdateCell: jest.fn(),
}))

const mockUseChat = useChat as jest.MockedFunction<typeof useChat>

describe('AI Functions', () => {
  const mockCells: CellData[] = [
    {
      id: 'cell-1',
      type: 'code',
      text: '# Test code',
      output: 'Test output',
      isCodeVisible: false,
      executionStatus: 'idle',
    },
  ]

  const mockOnCellUpdate = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseChat.mockReturnValue({
      messages: [],
      input: '',
      setInput: jest.fn(),
      handleSubmit: jest.fn(),
      isLoading: false,
    } as unknown as ReturnType<typeof useChat>)
  })

  it('renders function calls UI', () => {
    render(<Chat cells={mockCells} onCellUpdate={mockOnCellUpdate} />)
    expect(screen.getByText('AI Assistant')).toBeInTheDocument()
  })

  it('displays function call messages when provided', () => {
    const mockMessages = [
      {
        id: '1',
        role: 'assistant',
        content: 'I can help you with that.',
        toolInvocations: [
          {
            toolCallId: 'call-1',
            toolName: 'listCells',
            args: {},
          },
        ],
      },
    ]

    mockUseChat.mockReturnValue({
      messages: mockMessages,
      input: '',
      setInput: jest.fn(),
      handleSubmit: jest.fn(),
      isLoading: false,
    } as unknown as ReturnType<typeof useChat>)

    render(<Chat cells={mockCells} onCellUpdate={mockOnCellUpdate} />)
    expect(screen.getByText('I can help you with that.')).toBeInTheDocument()
    expect(screen.getByText('listCells()')).toBeInTheDocument()
  })

  it('passes correct props to Chat component', () => {
    render(<Chat cells={mockCells} onCellUpdate={mockOnCellUpdate} />)
    // If we get here without errors, the props are correctly typed
    expect(screen.getByText('AI Assistant')).toBeInTheDocument()
  })
})
