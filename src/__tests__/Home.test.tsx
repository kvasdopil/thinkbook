import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Home from '../components/Home';
import { useNotebookFiles } from '../hooks/useNotebookFiles';
import { useGeminiApiKey } from '../hooks/useGeminiApiKey';
import { useSnowflakeConfig } from '../hooks/useSnowflakeConfig';
import '@testing-library/jest-dom';

jest.mock('../hooks/useNotebookFiles');
jest.mock('../hooks/useGeminiApiKey');
jest.mock('../hooks/useSnowflakeConfig');
jest.mock('../components/ConversationList', () => () => <div>Mock Conversation List Component</div>);
jest.mock('../components/FixedChatInput', () => () => <div>Mock Fixed Chat Input Component</div>);

const mockUseNotebookFiles = useNotebookFiles as jest.Mock;
const mockUseGeminiApiKey = useGeminiApiKey as jest.Mock;
const mockUseSnowflakeConfig = useSnowflakeConfig as jest.Mock;

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

  beforeEach(() => {
    mockUseGeminiApiKey.mockReturnValue({ apiKey: 'test-key', isLoaded: true });
    mockUseSnowflakeConfig.mockReturnValue({
      snowflakeConfig: { accessToken: 'test-token', hostname: 'test-host' },
      isLoaded: true,
    });
  });

  it('renders the notebook header with the correct title', async () => {
    await act(async () => {
      render(
        <Home
          activeFile={mockActiveFile}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />
      )
    })
    expect(screen.getByDisplayValue('Test Title')).toBeInTheDocument()
  })

  it('renders the conversation and input components', async () => {
    await act(async () => {
      render(
        <Home
          activeFile={mockActiveFile}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />
      )
    })
    expect(
      screen.getByText('Mock Conversation List Component')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Mock Fixed Chat Input Component')
    ).toBeInTheDocument()
  })
})
