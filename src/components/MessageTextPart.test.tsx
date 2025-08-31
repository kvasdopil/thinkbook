import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MessageTextPart } from './MessageTextPart';

describe('MessageTextPart', () => {
  it('renders plain text content correctly', () => {
    const part = { type: 'text' as const, text: 'Hello, world!' };

    render(<MessageTextPart part={part} />);

    expect(screen.getByText('Hello, world!')).toBeInTheDocument();
  });

  it('renders markdown headings', () => {
    const part = { type: 'text' as const, text: '# Heading 1\n## Heading 2' };

    render(<MessageTextPart part={part} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Heading 1',
    );
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Heading 2',
    );
  });

  it('renders markdown lists', () => {
    const part = {
      type: 'text' as const,
      text: '- Item 1\n- Item 2\n- Item 3',
    };

    render(<MessageTextPart part={part} />);

    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });

  it('renders markdown tables with horizontal scrolling', () => {
    const part = {
      type: 'text' as const,
      text: '| Column 1 | Column 2 |\n|----------|----------|\n| Value 1  | Value 2  |',
    };

    const { container } = render(<MessageTextPart part={part} />);

    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();

    const scrollContainer = container.querySelector('.overflow-x-auto');
    expect(scrollContainer).toBeInTheDocument();

    expect(screen.getByText('Column 1')).toBeInTheDocument();
    expect(screen.getByText('Value 1')).toBeInTheDocument();
  });

  it('renders inline code', () => {
    const part = {
      type: 'text' as const,
      text: 'Here is `inline code` example',
    };

    render(<MessageTextPart part={part} />);

    const codeElement = screen.getByText('inline code');
    expect(codeElement).toBeInTheDocument();
    expect(codeElement.tagName).toBe('CODE');
  });

  it('renders code blocks', () => {
    const part = {
      type: 'text' as const,
      text: '```javascript\nconst hello = "world";\nconsole.log(hello);\n```',
    };

    const { container } = render(<MessageTextPart part={part} />);

    const codeElement = container.querySelector('code.block');
    expect(codeElement).toBeInTheDocument();
    expect(codeElement).toHaveClass(
      'bg-gray-900',
      'text-gray-100',
      'overflow-x-auto',
    );

    expect(screen.getByText(/const hello = "world"/)).toBeInTheDocument();
  });

  it('applies correct prose classes', () => {
    const part = { type: 'text' as const, text: 'Test content' };

    const { container } = render(<MessageTextPart part={part} />);

    const proseContainer = container.querySelector('.prose');
    expect(proseContainer).toBeInTheDocument();
    expect(proseContainer).toHaveClass('prose', 'prose-gray', 'max-w-none');
  });
});
