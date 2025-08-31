import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ChatMessage } from './ChatMessage';

describe('ChatMessage', () => {
  it('renders user message with correct styling', () => {
    const message = {
      id: '1',
      role: 'user' as const,
      parts: [{ type: 'text' as const, text: 'Hello AI!' }],
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText('Hello AI!')).toBeInTheDocument();

    const messageContainer = screen
      .getByText('Hello AI!')
      .closest('div.bg-primary-600');
    expect(messageContainer).toHaveClass('bg-primary-600', 'text-white');
  });

  it('renders assistant message with tool call indicators', () => {
    const message = {
      id: '2',
      role: 'assistant' as const,
      parts: [{ type: 'text' as const, text: 'Hello there!' }],
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText('Hello there!')).toBeInTheDocument();
    expect(
      screen.getByText(/I'll analyze your request and provide insights/),
    ).toBeInTheDocument();
  });

  it('aligns user messages to the right', () => {
    const message = {
      id: '1',
      role: 'user' as const,
      parts: [{ type: 'text' as const, text: 'User message' }],
    };

    render(<ChatMessage message={message} />);

    const wrapper = screen.getByText('User message').closest('.flex');
    expect(wrapper).toHaveClass('justify-end');
  });

  it('shows assistant message layout for assistant messages', () => {
    const message = {
      id: '2',
      role: 'assistant' as const,
      parts: [{ type: 'text' as const, text: 'Assistant message' }],
    };

    render(<ChatMessage message={message} />);

    const wrapper = screen.getByText('Assistant message').closest('.space-y-6');
    expect(wrapper).toHaveClass('space-y-6');
  });

  it('renders multiple text parts', () => {
    const message = {
      id: '3',
      role: 'assistant' as const,
      parts: [
        { type: 'text' as const, text: 'Part 1' },
        { type: 'text' as const, text: 'Part 2' },
      ],
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText('Part 1')).toBeInTheDocument();
    expect(screen.getByText('Part 2')).toBeInTheDocument();
  });
});
