import { render, screen } from '@testing-library/react'
import Chat from '../components/Chat'
import { useChat } from 'ai/react'
import type { CellData } from '@/types/cell'
import { executeCreateCodeCell } from '../ai-functions/create-code-cell'
import type { CreateCodeCellParams } from '../ai-functions/create-code-cell'

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
      parentId: null,
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
        parts: [
          {
            type: 'text',
            text: 'I can help you with that.',
          },
          {
            type: 'tool-invocation',
            toolInvocation: {
              toolCallId: 'call-1',
              toolName: 'listCells',
              args: {},
              state: 'result',
              result: 'Function executed successfully',
            },
          },
        ],
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

  it('displays createCodeCell function call messages', () => {
    const mockMessages = [
      {
        id: '1',
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: "I'll create a new code cell for you.",
          },
          {
            type: 'tool-invocation',
            toolInvocation: {
              toolCallId: 'call-2',
              toolName: 'createCodeCell',
              args: {
                text: '# Calculate basic statistics\nimport pandas as pd\ndf.describe()',
              },
              state: 'result',
              result: { success: true },
            },
          },
        ],
        toolInvocations: [
          {
            toolCallId: 'call-2',
            toolName: 'createCodeCell',
            args: {
              text: '# Calculate basic statistics\nimport pandas as pd\ndf.describe()',
            },
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
    expect(
      screen.getByText("I'll create a new code cell for you.")
    ).toBeInTheDocument()
    expect(screen.getByText('createCodeCell()')).toBeInTheDocument()
  })

  it('displays describeSnowflakeTable function call messages', () => {
    const mockMessages = [
      {
        id: '1',
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: "I'll describe the table structure for you.",
          },
          {
            type: 'tool-invocation',
            toolInvocation: {
              toolCallId: 'call-3',
              toolName: 'describeSnowflakeTable',
              args: {
                table: 'mydb.schema.users',
              },
              state: 'result',
              result: {
                data: [
                  ['column', 'type'],
                  ['id', 'NUMBER'],
                  ['name', 'VARCHAR'],
                ],
              },
            },
          },
        ],
        toolInvocations: [
          {
            toolCallId: 'call-3',
            toolName: 'describeSnowflakeTable',
            args: {
              table: 'mydb.schema.users',
            },
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
    expect(
      screen.getByText("I'll describe the table structure for you.")
    ).toBeInTheDocument()
    expect(screen.getByText('describeSnowflakeTable()')).toBeInTheDocument()
  })

  it('passes correct props to Chat component', () => {
    render(<Chat cells={mockCells} onCellUpdate={mockOnCellUpdate} />)
    // If we get here without errors, the props are correctly typed
    expect(screen.getByText('AI Assistant')).toBeInTheDocument()
  })
})

describe('createCodeCell function', () => {
  it('executes successfully with valid parameters', async () => {
    const mockOnCreateCell = jest.fn()
    const params: CreateCodeCellParams = {
      text: '# Calculate statistics\nimport pandas as pd\nprint("Hello")',
    }
    const dependencies = {
      onCreateCell: mockOnCreateCell,
      currentMessageId: 'msg-123',
    }

    const result = await executeCreateCodeCell(params, dependencies)

    expect(result).toEqual({ success: true })
    expect(mockOnCreateCell).toHaveBeenCalledWith(
      '# Calculate statistics\nimport pandas as pd\nprint("Hello")'
    )
  })

  it('throws error when no creation handler is provided', async () => {
    const params: CreateCodeCellParams = {
      text: '# Test code\nprint("test")',
    }
    const dependencies = {
      currentMessageId: 'msg-123',
    }

    await expect(executeCreateCodeCell(params, dependencies)).rejects.toThrow(
      'Cannot create cell - no creation handler available'
    )
  })

  it('creates cell with proper description from top-level comment', async () => {
    const mockOnCreateCell = jest.fn()
    const params: CreateCodeCellParams = {
      text: '# Load and preprocess the dataset\n# This cell handles data loading\nimport pandas as pd\ndf = pd.read_csv("data.csv")',
    }
    const dependencies = {
      onCreateCell: mockOnCreateCell,
      currentMessageId: 'msg-456',
    }

    const result = await executeCreateCodeCell(params, dependencies)

    expect(result).toEqual({ success: true })
    expect(mockOnCreateCell).toHaveBeenCalledWith(
      '# Load and preprocess the dataset\n# This cell handles data loading\nimport pandas as pd\ndf = pd.read_csv("data.csv")'
    )
  })

  it('handles code without descriptive comments', async () => {
    const mockOnCreateCell = jest.fn()
    const params: CreateCodeCellParams = {
      text: 'import numpy as np\nx = np.array([1, 2, 3])\nprint(x)',
    }
    const dependencies = {
      onCreateCell: mockOnCreateCell,
      currentMessageId: 'msg-789',
    }

    const result = await executeCreateCodeCell(params, dependencies)

    expect(result).toEqual({ success: true })
    expect(mockOnCreateCell).toHaveBeenCalledWith(
      'import numpy as np\nx = np.array([1, 2, 3])\nprint(x)'
    )
  })
})
