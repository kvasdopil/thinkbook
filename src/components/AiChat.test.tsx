import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { AiChat } from './AiChat';
import * as useEditableChatHook from '../hooks/useEditableChat';

vi.mock('../hooks/useEditableChat');

const mockUseEditableChat = useEditableChatHook.useEditableChat as Mock;

describe('AiChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock scrollIntoView
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      value: vi.fn(),
      writable: true,
    });
  });

  it('shows configuration message when API key is not available', () => {
    mockUseEditableChat.mockReturnValue({
      messages: [],
      isLoading: false,
      error: null,
      hasApiKey: false,
      sendMessage: vi.fn(),
      startEditing: vi.fn(),
      cancelEditing: vi.fn(),
      rollbackAndEdit: vi.fn(),
      editingMessageId: null,
    });

    render(<AiChat />);

    expect(
      screen.getByText(
        /Please configure your Gemini API key in settings to start using the AI chat/,
      ),
    ).toBeInTheDocument();
  });

  it('renders chat interface when API key is available', () => {
    mockUseEditableChat.mockReturnValue({
      messages: [],
      isLoading: false,
      error: null,
      hasApiKey: true,
      sendMessage: vi.fn(),
      startEditing: vi.fn(),
      cancelEditing: vi.fn(),
      rollbackAndEdit: vi.fn(),
      editingMessageId: null,
    });

    render(<AiChat />);

    expect(
      screen.getByPlaceholderText('Ask the AI assistant...'),
    ).toBeInTheDocument();
  });

  it('shows alert when trying to send message without API key', async () => {
    mockUseEditableChat.mockReturnValue({
      messages: [],
      isLoading: false,
      error: null,
      hasApiKey: false,
      sendMessage: vi.fn(),
      startEditing: vi.fn(),
      cancelEditing: vi.fn(),
      rollbackAndEdit: vi.fn(),
      editingMessageId: null,
    });

    render(<AiChat />);

    expect(
      screen.getByText(
        /Please configure your Gemini API key in settings to start using the AI chat/,
      ),
    ).toBeInTheDocument();
  });

  it('displays user message immediately when sent', async () => {
    const mockSendMessage = vi.fn();
    mockUseEditableChat.mockReturnValue({
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          parts: [{ type: 'text', text: 'Test message' }],
          originalMessage: {},
        },
      ],
      isLoading: false,
      error: null,
      hasApiKey: true,
      sendMessage: mockSendMessage,
      startEditing: vi.fn(),
      cancelEditing: vi.fn(),
      rollbackAndEdit: vi.fn(),
      editingMessageId: null,
    });

    render(<AiChat />);

    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('handles streaming AI response', async () => {
    mockUseEditableChat.mockReturnValue({
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          parts: [{ type: 'text', text: 'Test message' }],
          originalMessage: {},
        },
        {
          id: 'msg-2',
          role: 'assistant',
          parts: [{ type: 'text', text: 'Hello there!' }],
          originalMessage: {},
        },
      ],
      isLoading: false,
      error: null,
      hasApiKey: true,
      sendMessage: vi.fn(),
      startEditing: vi.fn(),
      cancelEditing: vi.fn(),
      rollbackAndEdit: vi.fn(),
      editingMessageId: null,
    });

    render(<AiChat />);

    expect(screen.getByText('Hello there!')).toBeInTheDocument();
  });

  it('shows thinking state while loading', async () => {
    mockUseEditableChat.mockReturnValue({
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          parts: [{ type: 'text', text: 'Test message' }],
          originalMessage: {},
        },
      ],
      isLoading: true,
      error: null,
      hasApiKey: true,
      sendMessage: vi.fn(),
      startEditing: vi.fn(),
      cancelEditing: vi.fn(),
      rollbackAndEdit: vi.fn(),
      editingMessageId: null,
    });

    render(<AiChat />);

    expect(screen.getByText('Thinking...')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    mockUseEditableChat.mockReturnValue({
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          parts: [{ type: 'text', text: 'Test message' }],
          originalMessage: {},
        },
      ],
      isLoading: false,
      error: 'API Error',
      hasApiKey: true,
      sendMessage: vi.fn(),
      startEditing: vi.fn(),
      cancelEditing: vi.fn(),
      rollbackAndEdit: vi.fn(),
      editingMessageId: null,
    });

    render(<AiChat />);

    expect(screen.getByText(/Error:.*API Error/)).toBeInTheDocument();
  });
});
