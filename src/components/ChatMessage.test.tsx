import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { type UIMessage } from 'ai';
import { ChatMessage } from './ChatMessage';

describe('ChatMessage', () => {
  it('renders user message with correct styling', () => {
    const message: UIMessage = {
      id: '1',
      role: 'user',
      parts: [{ type: 'text', text: 'Hello AI!' }],
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText('Hello AI!')).toBeInTheDocument();

    const messageContainer = screen
      .getByText('Hello AI!')
      .closest('div.bg-blue-600');
    expect(messageContainer).toHaveClass('bg-blue-600', 'text-white');
  });

  it('renders assistant message with content', () => {
    const message: UIMessage = {
      id: '2',
      role: 'assistant',
      parts: [{ type: 'text', text: 'Hello there!' }],
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText('Hello there!')).toBeInTheDocument();
  });

  it('aligns user messages to the right', () => {
    const message: UIMessage = {
      id: '1',
      role: 'user',
      parts: [{ type: 'text', text: 'User message' }],
    };

    render(<ChatMessage message={message} />);

    const wrapper = screen.getByText('User message').closest('.flex');
    expect(wrapper).toHaveClass('justify-end');
  });

  it('shows assistant message layout for assistant messages', () => {
    const message: UIMessage = {
      id: '2',
      role: 'assistant',
      parts: [{ type: 'text', text: 'Assistant message' }],
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText('Assistant message')).toBeInTheDocument();
  });

  it('renders multiple text parts', () => {
    const message: UIMessage = {
      id: '3',
      role: 'assistant',
      parts: [
        { type: 'text', text: 'Part 1 ' },
        { type: 'text', text: 'Part 2' },
      ],
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText('Part 1 Part 2')).toBeInTheDocument();
  });
});
