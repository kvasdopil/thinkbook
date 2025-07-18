import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import Home from '@/components/Home';
import { NotebookFile } from '@/components/FilePanel';
import { Message } from 'ai/react';
import { CellData } from '@/types/cell';

// Mocks
jest.mock('ai/react', () => ({
  ...jest.requireActual('ai/react'),
  useChat: jest.fn(),
}));

const mockUseChat = require('ai/react').useChat;

const mockOnUpdate = jest.fn();
const mockOnDelete = jest.fn();

const initialMessages: Message[] = [
  { id: '1', role: 'user', content: 'First message', createdAt: new Date() },
  { id: '2', role: 'assistant', content: 'First response', createdAt: new Date() },
  { id: '3', role: 'user', content: 'Second message', createdAt: new Date() },
];

const initialCells: CellData[] = [
  {
    id: 'cell1',
    text: 'print("hello")',
    output: '',
    isCodeVisible: true,
    executionStatus: 'idle',
    parentId: '2',
    tables: [],
  },
];

const activeFile: NotebookFile = {
  id: 'file1',
  title: 'Test Notebook',
  cells: initialCells,
  messages: initialMessages,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Rollback functionality', () => {
  beforeEach(() => {
    mockUseChat.mockReturnValue({
      messages: initialMessages,
      setMessages: jest.fn(),
      handleSubmit: jest.fn(),
      input: '',
      setInput: jest.fn(),
      isLoading: false,
    });
  });

  it('removes subsequent messages and cells on save', async () => {
    const setMessages = jest.fn();
    const handleSubmit = jest.fn();
    mockUseChat.mockReturnValue({
      messages: initialMessages,
      setMessages,
      handleSubmit,
      input: '',
      setInput: jest.fn(),
      isLoading: false,
    });

    render(
      <Home
        activeFile={activeFile}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    // Click the first message to edit it
    fireEvent.click(screen.getByText('First message'));

    // Change the content and save
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Edited first message' } });
    fireEvent.click(screen.getByLabelText('Send'));

    await waitFor(() => {
      // Check that setMessages was called with the correct messages
      expect(setMessages).toHaveBeenCalledWith([
        { id: '1', role: 'user', content: 'Edited first message', createdAt: expect.any(Date) },
      ]);

      // Check that onUpdate was called with the correct data
      expect(mockOnUpdate).toHaveBeenCalledWith({
        messages: [
          { id: '1', role: 'user', content: 'Edited first message', createdAt: expect.any(Date) },
        ],
        cells: [],
      });

      // Check that handleSubmit was called
      expect(handleSubmit).toHaveBeenCalled();
    });
  });
});
