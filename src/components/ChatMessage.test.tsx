import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ChatMessage } from './ChatMessage';

describe('ChatMessage', () => {
  it('renders user message with correct styling', () => {
    const message = {
      id: '1',
      role: 'user' as const,
      content: 'Hello AI!',
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText('Hello AI!')).toBeInTheDocument();

    const messageContainer = screen
      .getByText('Hello AI!')
      .closest('div.bg-blue-600');
    expect(messageContainer).toHaveClass('bg-blue-600', 'text-white');
  });

  it('renders assistant message with content', () => {
    const message = {
      id: '2',
      role: 'assistant' as const,
      content: 'Hello there!',
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText('Hello there!')).toBeInTheDocument();
  });

  it('aligns user messages to the right', () => {
    const message = {
      id: '1',
      role: 'user' as const,
      content: 'User message',
    };

    render(<ChatMessage message={message} />);

    const wrapper = screen.getByText('User message').closest('.flex');
    expect(wrapper).toHaveClass('justify-end');
  });

  it('shows assistant message layout for assistant messages', () => {
    const message = {
      id: '2',
      role: 'assistant' as const,
      content: 'Assistant message',
    };

    render(<ChatMessage message={message} />);

    const wrapper = screen.getByText('Assistant message').closest('.space-y-6');
    expect(wrapper).toHaveClass('space-y-6');
  });

  it('renders multiple text parts', () => {
    const message = {
      id: '3',
      role: 'assistant' as const,
      content: 'Part 1 Part 2',
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText('Part 1 Part 2')).toBeInTheDocument();
  });
});
