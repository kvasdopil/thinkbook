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

    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByText('Hello AI!')).toBeInTheDocument();
    
    const messageContainer = screen.getByText('Hello AI!').closest('div.bg-blue-500');
    expect(messageContainer).toHaveClass('bg-blue-500', 'text-white');
  });

  it('renders assistant message with correct styling', () => {
    const message = {
      id: '2',
      role: 'assistant' as const,
      parts: [{ type: 'text' as const, text: 'Hello there!' }],
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText('Assistant')).toBeInTheDocument();
    expect(screen.getByText('Hello there!')).toBeInTheDocument();
    
    const messageContainer = screen.getByText('Hello there!').closest('div.bg-gray-100');
    expect(messageContainer).toHaveClass('bg-gray-100', 'text-gray-900');
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

  it('aligns assistant messages to the left', () => {
    const message = {
      id: '2',
      role: 'assistant' as const,
      parts: [{ type: 'text' as const, text: 'Assistant message' }],
    };

    render(<ChatMessage message={message} />);

    const wrapper = screen.getByText('Assistant message').closest('.flex');
    expect(wrapper).toHaveClass('justify-start');
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