import { render, screen, fireEvent } from '@testing-library/react'
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

describe('Chat', () => {
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

  it('renders the chat component', () => {
    render(<Chat cells={mockCells} onCellUpdate={mockOnCellUpdate} />)
    expect(screen.getByText('AI Assistant')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Ask me anything about Python, data analysis, or programming concepts!'
      )
    ).toBeInTheDocument()
  })

  it('renders the message input and send button', () => {
    render(<Chat cells={mockCells} onCellUpdate={mockOnCellUpdate} />)
    expect(
      screen.getByPlaceholderText(
        'Ask a question... (Enter to send, Shift+Enter for new line)'
      )
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /send message/i })
    ).toBeInTheDocument()
  })

  it('displays messages when provided', () => {
    const mockMessages = [
      { id: '1', role: 'user', content: 'Hello' },
      { id: '2', role: 'assistant', content: 'Hi there!' },
    ]
    mockUseChat.mockReturnValue({
      messages: mockMessages,
      input: '',
      setInput: jest.fn(),
      handleSubmit: jest.fn(),
      isLoading: false,
    } as unknown as ReturnType<typeof useChat>)

    render(<Chat cells={mockCells} onCellUpdate={mockOnCellUpdate} />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('Hi there!')).toBeInTheDocument()
  })

  it('disables send button when input is empty', () => {
    render(<Chat cells={mockCells} onCellUpdate={mockOnCellUpdate} />)
    const sendButton = screen.getByRole('button', { name: /send message/i })
    expect(sendButton).toBeDisabled()
  })

  it('enables send button when input has content', () => {
    const mockSetInput = jest.fn()
    mockUseChat.mockReturnValue({
      messages: [],
      input: 'Test message',
      setInput: mockSetInput,
      handleSubmit: jest.fn(),
      isLoading: false,
    } as unknown as ReturnType<typeof useChat>)

    render(<Chat cells={mockCells} onCellUpdate={mockOnCellUpdate} />)
    const sendButton = screen.getByRole('button', { name: /send message/i })
    expect(sendButton).not.toBeDisabled()
  })

  it('calls handleSubmit when form is submitted', () => {
    const mockHandleSubmit = jest.fn()
    mockUseChat.mockReturnValue({
      messages: [],
      input: 'Test message',
      setInput: jest.fn(),
      handleSubmit: mockHandleSubmit,
      isLoading: false,
    } as unknown as ReturnType<typeof useChat>)

    render(<Chat cells={mockCells} onCellUpdate={mockOnCellUpdate} />)
    const form = screen
      .getByRole('button', { name: /send message/i })
      .closest('form')
    fireEvent.submit(form!)
    expect(mockHandleSubmit).toHaveBeenCalledTimes(1)
  })

  it('shows loading state when isLoading is true', () => {
    mockUseChat.mockReturnValue({
      messages: [],
      input: '',
      setInput: jest.fn(),
      handleSubmit: jest.fn(),
      isLoading: true,
    } as unknown as ReturnType<typeof useChat>)

    render(<Chat cells={mockCells} onCellUpdate={mockOnCellUpdate} />)
    expect(screen.getByText('typing...')).toBeInTheDocument()
  })

  it('handles Enter key to send message', () => {
    const mockHandleSubmit = jest.fn()
    mockUseChat.mockReturnValue({
      messages: [],
      input: 'Test message',
      setInput: jest.fn(),
      handleSubmit: mockHandleSubmit,
      isLoading: false,
    } as unknown as ReturnType<typeof useChat>)

    render(<Chat cells={mockCells} onCellUpdate={mockOnCellUpdate} />)
    const textarea = screen.getByPlaceholderText(
      'Ask a question... (Enter to send, Shift+Enter for new line)'
    )

    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' })
    expect(mockHandleSubmit).toHaveBeenCalledTimes(1)
  })

  it('does not send message on Shift+Enter', () => {
    const mockHandleSubmit = jest.fn()
    mockUseChat.mockReturnValue({
      messages: [],
      input: 'Test message',
      setInput: jest.fn(),
      handleSubmit: mockHandleSubmit,
      isLoading: false,
    } as unknown as ReturnType<typeof useChat>)

    render(<Chat cells={mockCells} onCellUpdate={mockOnCellUpdate} />)
    const textarea = screen.getByPlaceholderText(
      'Ask a question... (Enter to send, Shift+Enter for new line)'
    )

    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter', shiftKey: true })
    expect(mockHandleSubmit).not.toHaveBeenCalled()
  })
})
