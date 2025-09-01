import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { ChatMessage } from './ChatMessage';
import type { MessageWithId } from '../hooks/useEditableChat';
import { useEditStore } from '../store/editStore';

// Mock the edit store
vi.mock('../store/editStore');

describe('ChatMessage', () => {
  const mockProps = {
    messageIndex: 0,
    editingMessageIndex: -1,
    onStartEdit: vi.fn(),
    onCancelEdit: vi.fn(),
    onSendEdit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    const mockUseEditStore = vi.mocked(useEditStore);
    mockUseEditStore.mockReturnValue({
      editingMessageId: null,
      setEditingMessageId: vi.fn(),
    });
  });

  it('renders user message with correct styling', () => {
    const message: MessageWithId = {
      id: 'msg-1',
      role: 'user',
      parts: [{ type: 'text', text: 'Hello AI!' }],
      originalMessage: {},
    };

    render(<ChatMessage message={message} {...mockProps} />);

    expect(screen.getByText('Hello AI!')).toBeInTheDocument();

    const messageContainer = screen
      .getByText('Hello AI!')
      .closest('div.bg-blue-600');
    expect(messageContainer).toHaveClass('bg-blue-600', 'text-white');
  });

  it('renders assistant message with content', () => {
    const message: MessageWithId = {
      id: 'msg-2',
      role: 'assistant',
      parts: [{ type: 'text', text: 'Hello there!' }],
      originalMessage: {},
    };

    render(<ChatMessage message={message} {...mockProps} />);

    expect(screen.getByText('Hello there!')).toBeInTheDocument();
  });

  it('aligns user messages to the right', () => {
    const message: MessageWithId = {
      id: 'msg-1',
      role: 'user',
      parts: [{ type: 'text', text: 'User message' }],
      originalMessage: {},
    };

    render(<ChatMessage message={message} {...mockProps} />);

    const wrapper = screen.getByText('User message').closest('.flex');
    expect(wrapper).toHaveClass('justify-end');
  });

  it('calls onStartEdit when user message is clicked', async () => {
    const message: MessageWithId = {
      id: 'msg-1',
      role: 'user',
      parts: [{ type: 'text', text: 'User message' }],
      originalMessage: {},
    };

    render(<ChatMessage message={message} {...mockProps} />);

    const messageElement = screen.getByText('User message').closest('div.cursor-pointer');
    await userEvent.click(messageElement!);

    expect(mockProps.onStartEdit).toHaveBeenCalledWith('msg-1');
  });

  it('renders multiple text parts', () => {
    const message: MessageWithId = {
      id: 'msg-3',
      role: 'assistant',
      parts: [
        { type: 'text', text: 'Part 1 ' },
        { type: 'text', text: 'Part 2' },
      ],
      originalMessage: {},
    };

    render(<ChatMessage message={message} {...mockProps} />);

    expect(screen.getByText('Part 1 Part 2')).toBeInTheDocument();
  });

  it('applies opacity when message is after editing message', () => {
    // Mock an editing message ID
    const mockUseEditStore = vi.mocked(useEditStore);
    mockUseEditStore.mockReturnValue({
      editingMessageId: 'msg-1',
      setEditingMessageId: vi.fn(),
    });

    const message: MessageWithId = {
      id: 'msg-2',
      role: 'user',
      parts: [{ type: 'text', text: 'Second message' }],
      originalMessage: {},
    };

    const propsWithEditing = {
      ...mockProps,
      messageIndex: 1,
      editingMessageIndex: 0,
    };

    render(<ChatMessage message={message} {...propsWithEditing} />);

    // Check that opacity class is applied due to editingMessageIndex prop
    const wrapper = screen.getByText('Second message').closest('.opacity-70');
    expect(wrapper).toHaveClass('opacity-70');
  });
});
