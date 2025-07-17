import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Home from '../components/Home';
import { useNotebookFiles } from '../hooks/useNotebookFiles';
import '@testing-library/jest-dom';

jest.mock('../hooks/useNotebookFiles');
jest.mock('../components/ConversationList', () => () => <div>Mock Conversation List Component</div>);
jest.mock('../components/FixedChatInput', () => () => <div>Mock Fixed Chat Input Component</div>);

const mockUseNotebookFiles = useNotebookFiles as jest.Mock;

describe('Home', () => {
  const mockActiveFile = {
    id: '1',
    title: 'Test Title',
    cells: [],
    messages: [],
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
  }

  const mockOnUpdate = jest.fn()
  const mockOnDelete = jest.fn()

  it('renders the notebook header with the correct title', () => {
    render(
      <Home
        activeFile={mockActiveFile}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )
    expect(screen.getByDisplayValue('Test Title')).toBeInTheDocument()
  })

  it('renders the conversation and input components', () => {
    render(
      <Home
        activeFile={mockActiveFile}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )
    expect(
      screen.getByText('Mock Conversation List Component')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Mock Fixed Chat Input Component')
    ).toBeInTheDocument()
  })
})
