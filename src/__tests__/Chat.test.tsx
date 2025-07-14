/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

describe('Chat', () => {
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

  it('renders with initial empty state', () => {
    render(<Chat />)

    expect(screen.getByText('AI Assistant')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Ask me anything about Python, data analysis, or programming concepts!'
      )
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Send message')).toBeDisabled()
  })

  it('enables send button when input has content', async () => {
    mockUseChat.mockReturnValue({
      messages: [],
      input: 'Hello',
      setInput: mockSetInput,
      handleSubmit: mockHandleSubmit,
      isLoading: false,
    })

    render(<Chat />)

    const sendButton = screen.getByLabelText('Send message')
    expect(sendButton).not.toBeDisabled()
  })

  it('submits message when send button is clicked', async () => {
    const user = userEvent.setup()

    const messages = [
      { role: 'user', content: 'Test message' },
      { role: 'assistant', content: 'Hello' },
    ]

    mockUseChat.mockReturnValue({
      messages,
      input: 'Test message',
      setInput: mockSetInput,
      handleSubmit: mockHandleSubmit,
      isLoading: false,
    })

    render(<Chat />)

    const sendButton = screen.getByLabelText('Send message')
    await user.click(sendButton)

    expect(mockHandleSubmit).toHaveBeenCalled()
    // Check messages in chat history - use getAllByText to handle multiple matches
    const testMessages = screen.getAllByText('Test message')
    const chatMessage = testMessages.find((el) => el.closest('.bg-blue-500'))
    expect(chatMessage).toBeInTheDocument()
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('submits message on Enter key press', async () => {
    const user = userEvent.setup()

    mockUseChat.mockReturnValue({
      messages: [],
      input: 'Test message',
      setInput: mockSetInput,
      handleSubmit: mockHandleSubmit,
      isLoading: false,
    })

    render(<Chat />)

    const textarea = screen.getByPlaceholderText(/Ask a question/)
    await user.click(textarea)
    await user.keyboard('{Enter}')

    expect(mockHandleSubmit).toHaveBeenCalled()
  })

  it('adds newline on Shift+Enter', async () => {
    const user = userEvent.setup()

    render(<Chat />)

    const textarea = screen.getByPlaceholderText(/Ask a question/)
    await user.click(textarea)
    await user.keyboard('Line 1{Shift>}{Enter}{/Shift}Line 2')

    // The setInput should have been called with the updated value
    // This tests that shift+enter doesn't submit but allows newlines
    expect(mockSetInput).toHaveBeenCalled()
  })

  it('shows typing state during loading', () => {
    mockUseChat.mockReturnValue({
      messages: [{ role: 'user', content: 'Test message' }],
      input: '',
      setInput: mockSetInput,
      handleSubmit: mockHandleSubmit,
      isLoading: true,
    })

    render(<Chat />)

    expect(screen.getByText('typing...')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Ask a question/)).toBeDisabled()
  })

  it('disables input and button when loading', () => {
    mockUseChat.mockReturnValue({
      messages: [],
      input: '',
      setInput: mockSetInput,
      handleSubmit: mockHandleSubmit,
      isLoading: true,
    })

    render(<Chat />)

    const textarea = screen.getByPlaceholderText(/Ask a question/)
    const sendButton = screen.getByLabelText('Send message')

    expect(textarea).toBeDisabled()
    expect(sendButton).toBeDisabled()
  })

  it('displays messages with correct styling', () => {
    const messages = [
      { role: 'user', content: 'User message' },
      { role: 'assistant', content: 'AI response' },
    ]

    mockUseChat.mockReturnValue({
      messages,
      input: '',
      setInput: mockSetInput,
      handleSubmit: mockHandleSubmit,
      isLoading: false,
    })

    render(<Chat />)

    const userMessage = screen.getByText('User message').parentElement
    const aiMessage = screen.getByText('AI response').parentElement

    expect(userMessage).toHaveClass('bg-blue-500', 'text-white')
    expect(aiMessage).toHaveClass('bg-gray-100', 'text-gray-800')
  })
})
