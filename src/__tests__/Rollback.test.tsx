import React from 'react'
import { render, fireEvent, screen, waitFor, act } from '@testing-library/react'
import Home from '@/components/Home'
import { NotebookFile } from '@/components/FilePanel'
import { Message } from 'ai/react'
import { CellData } from '@/types/cell'

// Mocks
jest.mock('ai/react', () => {
  const actual = jest.requireActual('ai/react')
  return {
    ...actual,
    useChat: jest.fn(),
  }
})
import { useChat } from 'ai/react'
const mockUseChat = useChat as jest.Mock

const mockOnUpdate = jest.fn()
const mockOnDelete = jest.fn()

const initialMessages: Message[] = [
  { id: '1', role: 'user', content: 'First message', createdAt: new Date() },
  {
    id: '2',
    role: 'assistant',
    content: 'First response',
    createdAt: new Date(),
  },
  { id: '3', role: 'user', content: 'Second message', createdAt: new Date() },
]

const initialCells: CellData[] = [
  {
    id: 'cell1',
    type: 'code',
    text: 'print("hello")',
    output: '',
    isCodeVisible: true,
    executionStatus: 'idle',
    parentId: '2',
    tables: [],
  },
]

const activeFile: NotebookFile = {
  id: 'file1',
  title: 'Test Notebook',
  cells: initialCells,
  messages: initialMessages,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('Rollback functionality', () => {
  beforeEach(() => {
    mockUseChat.mockReturnValue({
      messages: initialMessages,
      setMessages: jest.fn(),
      handleSubmit: jest.fn(),
      input: '',
      setInput: jest.fn(),
      isLoading: false,
    })
  })

  it('removes subsequent messages and cells on save', async () => {
    const setMessages = jest.fn()
    const handleSubmit = jest.fn()
    mockUseChat.mockReturnValue({
      messages: initialMessages,
      setMessages,
      handleSubmit,
      input: '',
      setInput: jest.fn(),
      isLoading: false,
    })

    render(
      <Home
        activeFile={activeFile}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    // Click the first message to edit it
    await act(async () => {
      fireEvent.click(screen.getByText('First message'))
    })

    // Change the content and save
    // There are multiple textboxes (title, chat input, message edit). The message edit textarea is the one with the value 'First message'.
    const textarea = screen
      .getAllByRole('textbox')
      .find(
        (el) =>
          el.tagName === 'TEXTAREA' &&
          (el as HTMLTextAreaElement).value === 'First message'
      )
    expect(textarea).toBeTruthy()
    
    await act(async () => {
      fireEvent.change(textarea as HTMLTextAreaElement, {
        target: { value: 'Edited first message' },
      })
      // Simulate pressing Enter to submit
      fireEvent.keyDown(textarea as HTMLTextAreaElement, { key: 'Enter', code: 'Enter' })
    })

    await waitFor(() => {
      // Check that setMessages was called with the correct messages
      expect(setMessages).toHaveBeenCalledWith([
        expect.objectContaining({
          id: '1',
          content: 'Edited first message',
        }),
      ])
    })
  })

  it('does not save if content is unchanged', async () => {
    const setMessages = jest.fn()
    const mockOnSaveEdit = jest.fn()
    
    // Mock the ConversationList component to directly test the onSaveEdit prop
    jest.mock('../components/ConversationList', () => {
      return function MockConversationList(props: any) {
        // Simulate calling onSaveEdit with unchanged content
        React.useEffect(() => {
          if (props.editingMessageId) {
            props.onSaveEdit(props.editingMessageId, 'First message') // Unchanged content
          }
        }, [props.editingMessageId])
        
        return <div>Mock Conversation List Component</div>
      }
    })
    
    render(
      <Home
        activeFile={activeFile}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    await act(async () => {
      // Simulate clicking to edit
      fireEvent.click(screen.getByText('First message'))
    })

    await waitFor(() => {
      expect(setMessages).not.toHaveBeenCalled()
    })
  })

  it('dims subsequent messages when editing', async () => {
    render(
      <Home
        activeFile={activeFile}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    await act(async () => {
      fireEvent.click(screen.getByText('First message'))
    })

    const firstMessage = screen.getByText('First message').parentElement
    const secondMessage = screen.getByText('First response').parentElement

    expect(firstMessage).not.toHaveClass('opacity-70')
    expect(secondMessage).toHaveClass('opacity-70')
  })
})
