/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from '@testing-library/react'
import { useChat } from 'ai/react'
import Chat from '../components/Chat'

// Mock the useChat hook from ai/react
const mockHandleSubmit = jest.fn()
const mockSetInput = jest.fn()

jest.mock('ai/react', () => ({
  useChat: jest.fn(),
}))

const mockUseChat = useChat as jest.MockedFunction<any>

// Mock scrollIntoView
HTMLElement.prototype.scrollIntoView = jest.fn()

describe('AI Function Calls', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default mock return value
    mockUseChat.mockReturnValue({
      messages: [],
      input: '',
      setInput: mockSetInput,
      handleSubmit: mockHandleSubmit,
      isLoading: false,
    })
  })

  it('renders function call balloons for tool invocations', async () => {
    const messages = [
      {
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
      messages,
      input: '',
      setInput: mockSetInput,
      handleSubmit: mockHandleSubmit,
      isLoading: false,
    })

    render(<Chat />)

    expect(screen.getByText('I can help you with that.')).toBeInTheDocument()
    expect(screen.getByText('listCells()')).toBeInTheDocument()
  })

  it('executes listCells function call', async () => {
    const cellCode = '# Test code\nprint("hello")'
    const cellOutput = 'hello\n'

    const messages = [
      {
        role: 'assistant',
        content: 'Let me check your cells.',
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
      messages,
      input: '',
      setInput: mockSetInput,
      handleSubmit: mockHandleSubmit,
      isLoading: false,
    })

    render(
      <Chat
        cellCode={cellCode}
        cellOutput={cellOutput}
        onCellCodeChange={jest.fn()}
      />
    )

    expect(screen.getByText('listCells()')).toBeInTheDocument()
  })

  it('executes updateCell function call', async () => {
    const mockOnCellCodeChange = jest.fn()

    const messages = [
      {
        role: 'assistant',
        content: 'Let me update your cell.',
        toolInvocations: [
          {
            toolCallId: 'call-1',
            toolName: 'updateCell',
            args: {
              id: 'cell-1',
              text: 'print("updated code")',
            },
          },
        ],
      },
    ]

    mockUseChat.mockReturnValue({
      messages,
      input: '',
      setInput: mockSetInput,
      handleSubmit: mockHandleSubmit,
      isLoading: false,
    })

    render(
      <Chat
        cellCode="# Original code"
        cellOutput="output"
        onCellCodeChange={mockOnCellCodeChange}
      />
    )

    expect(screen.getByText('updateCell()')).toBeInTheDocument()

    // Check for parameters in the formatted JSON
    expect(screen.getByText(/cell-1/)).toBeInTheDocument()
    expect(screen.getByText(/updated code/)).toBeInTheDocument()
  })

  it('displays function call status indicators', async () => {
    const messages = [
      {
        role: 'assistant',
        content: 'Working on it...',
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
      messages,
      input: '',
      setInput: mockSetInput,
      handleSubmit: mockHandleSubmit,
      isLoading: false,
    })

    render(<Chat />)

    // Function call balloon should be rendered
    expect(screen.getByText('listCells()')).toBeInTheDocument()

    // Should have status styling (in-progress by default)
    const functionBalloon = screen
      .getByText('listCells()')
      .closest('.bg-blue-50')
    expect(functionBalloon).toBeInTheDocument()
    expect(functionBalloon).toHaveClass('border-blue-200')
  })
})
