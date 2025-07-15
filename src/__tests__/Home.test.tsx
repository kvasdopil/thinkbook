import { render, screen } from '@testing-library/react'
import Home from '../app/page'

// Mock the ConversationList component
jest.mock('../components/ConversationList', () => {
  return function MockConversationList() {
    return <div>Mock Conversation List Component</div>
  }
})

// Mock the FixedChatInput component
jest.mock('../components/FixedChatInput', () => {
  return function MockFixedChatInput() {
    return <div>Mock Fixed Chat Input Component</div>
  }
})

// Mock the Cell component (still used inside ConversationList)
jest.mock('../components/Cell', () => {
  return function MockCell() {
    return <div>Mock Cell Component</div>
  }
})

// Mock the useChat hook from ai/react
jest.mock('ai/react', () => ({
  useChat: () => ({
    messages: [],
    input: '',
    setInput: jest.fn(),
    handleSubmit: jest.fn(),
    isLoading: false,
  }),
}))

// Mock the worker
jest.mock('../workers/pyodide.worker.ts', () => {
  return jest.fn()
})

describe('Home', () => {
  it('renders the main title', () => {
    render(<Home />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      '🐍 Python Notebook with AI Assistant'
    )
  })

  it('renders the conversation and input components', () => {
    render(<Home />)
    expect(
      screen.getByText('Mock Conversation List Component')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Mock Fixed Chat Input Component')
    ).toBeInTheDocument()
  })
})
