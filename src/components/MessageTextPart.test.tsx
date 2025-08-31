import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MessageTextPart } from './MessageTextPart';

describe('MessageTextPart', () => {
  it('renders text content correctly', () => {
    const part = { type: 'text' as const, text: 'Hello, world!' };

    render(<MessageTextPart part={part} />);

    expect(screen.getByText('Hello, world!')).toBeInTheDocument();
  });

  it('preserves whitespace and line breaks', () => {
    const part = { type: 'text' as const, text: 'Line 1\nLine 2\n\nLine 4' };

    const { container } = render(<MessageTextPart part={part} />);

    const element = container.querySelector('.whitespace-pre-wrap');
    expect(element).toBeInTheDocument();
    expect(element?.textContent).toBe('Line 1\nLine 2\n\nLine 4');
    expect(element).toHaveClass('whitespace-pre-wrap');
  });

  it('applies correct CSS classes', () => {
    const part = { type: 'text' as const, text: 'Test content' };

    render(<MessageTextPart part={part} />);

    const element = screen.getByText('Test content');
    expect(element).toHaveClass('whitespace-pre-wrap', 'break-words');
  });
});
