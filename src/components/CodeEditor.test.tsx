import { render } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CodeEditor } from './CodeEditor';

// Mock Monaco Editor
vi.mock('monaco-editor', () => ({
  editor: {
    create: vi.fn(() => ({
      getValue: vi.fn(() => ''),
      setValue: vi.fn(),
      onDidChangeModelContent: vi.fn(() => ({ dispose: vi.fn() })),
      getPosition: vi.fn(),
      setPosition: vi.fn(),
      updateOptions: vi.fn(),
      dispose: vi.fn(),
    })),
  },
  languages: {
    register: vi.fn(),
    setLanguageConfiguration: vi.fn(),
    setMonarchTokensProvider: vi.fn(),
  },
}));

// Mock Monaco workers utility
vi.mock('../utils/monacoWorkers', () => ({
  configureMonacoWorkers: vi.fn(),
}));

describe('CodeEditor', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the code editor container', () => {
    render(<CodeEditor value="print('hello')" onChange={mockOnChange} />);

    // Check if the container div is rendered
    const container = document.querySelector('div[style*="height: 200px"]');
    expect(container).toBeInTheDocument();
  });

  it('applies custom height when provided', () => {
    render(
      <CodeEditor
        value="print('hello')"
        onChange={mockOnChange}
        height={300}
      />,
    );

    const container = document.querySelector('div[style*="height: 300px"]');
    expect(container).toBeInTheDocument();
  });

  it('has correct default height', () => {
    render(<CodeEditor value="print('hello')" onChange={mockOnChange} />);

    const container = document.querySelector('div[style*="height: 200px"]');
    expect(container).toBeInTheDocument();
  });

  it('applies border styling', () => {
    render(<CodeEditor value="print('hello')" onChange={mockOnChange} />);

    const container = document.querySelector(
      '.border.border-gray-300.rounded-md.overflow-hidden',
    );
    expect(container).toBeInTheDocument();
  });
});
