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
  beforeEach(() => {
    mockUseNotebookFiles.mockReturnValue({
      files: [],
      activeFileId: null,
      isLoading: false,
      createNewFile: jest.fn(),
      selectFile: jest.fn(),
      getActiveFile: () => ({
        id: '1',
        title: 'Test File',
        cells: [],
        messages: [],
        createdAt: '',
        updatedAt: '',
      }),
      updateActiveFile: jest.fn(),
    });
  });

  it('renders the main title', () => {
    render(<Home initialCells={[]} initialMessages={[]} onUpdate={() => {}} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      '🐍 Python Notebook with AI Assistant'
    );
  });

  it('renders the conversation and input components', () => {
    render(<Home initialCells={[]} initialMessages={[]} onUpdate={() => {}} />);
    expect(screen.getByText('Mock Conversation List Component')).toBeInTheDocument();
    expect(screen.getByText('Mock Fixed Chat Input Component')).toBeInTheDocument();
  });
});
