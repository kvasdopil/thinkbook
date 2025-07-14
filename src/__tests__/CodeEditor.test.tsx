import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CodeEditor from '@/components/CodeEditor'

// Mock Monaco Editor
jest.mock('@monaco-editor/react', () => ({
  Editor: ({
    value,
    onChange,
  }: {
    value: string
    onChange?: (value: string | undefined) => void
  }) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}))

describe('CodeEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders with default code and UI elements', () => {
    render(<CodeEditor />)

    // Check for main UI elements
    expect(screen.getByText('Python Editor')).toBeInTheDocument()
    expect(screen.getByText('Output')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /run/i })).toBeInTheDocument()

    // Check for editor
    const editor = screen.getByTestId('monaco-editor')
    expect(editor).toBeInTheDocument()
    expect(editor).toHaveValue(
      '# Write your Python code here\nprint("Hello, World!")'
    )
  })

  it('renders with custom initial code', () => {
    const customCode = 'print("Custom code")'
    render(<CodeEditor initialCode={customCode} />)

    const editor = screen.getByTestId('monaco-editor')
    expect(editor).toHaveValue(customCode)
  })

  it('calls onCodeChange when code is modified', async () => {
    const user = userEvent.setup()
    const mockOnCodeChange = jest.fn()
    render(<CodeEditor onCodeChange={mockOnCodeChange} />)

    const editor = screen.getByTestId('monaco-editor')
    await user.clear(editor)
    await user.type(editor, 'print("test")')

    await waitFor(() => {
      expect(mockOnCodeChange).toHaveBeenCalledWith('print("test")')
    })
  })

  it('initializes worker and shows ready message', async () => {
    render(<CodeEditor />)

    // Wait for worker initialization
    await waitFor(
      () => {
        expect(
          screen.getByText('Python environment ready! 🐍')
        ).toBeInTheDocument()
      },
      { timeout: 1000 }
    )
  })

  it('disables run button initially', () => {
    render(<CodeEditor />)

    const runButton = screen.getByRole('button', { name: /run/i })
    expect(runButton).toBeDisabled()
  })

  it('enables run button when worker is ready', async () => {
    render(<CodeEditor />)

    const runButton = screen.getByRole('button', { name: /run/i })

    await waitFor(
      () => {
        expect(runButton).not.toBeDisabled()
      },
      { timeout: 1000 }
    )
  })

  it('executes code and shows streaming output', async () => {
    render(<CodeEditor />)

    // Wait for worker to be ready
    await waitFor(
      () => {
        expect(
          screen.getByText('Python environment ready! 🐍')
        ).toBeInTheDocument()
      },
      { timeout: 1000 }
    )

    const runButton = screen.getByRole('button', { name: /run/i })
    fireEvent.click(runButton)

    // Output should be cleared when execution starts
    expect(
      screen.queryByText('Python environment ready! 🐍')
    ).not.toBeInTheDocument()

    // Wait for streaming output from default print statement
    await waitFor(
      () => {
        expect(screen.getByText('Hello, World!')).toBeInTheDocument()
      },
      { timeout: 1500 }
    )
  })

  it('shows loading state during execution', async () => {
    render(<CodeEditor />)

    // Wait for worker to be ready
    await waitFor(
      () => {
        expect(
          screen.getByText('Python environment ready! 🐍')
        ).toBeInTheDocument()
      },
      { timeout: 1000 }
    )

    const runButton = screen.getByRole('button', { name: /run/i })
    fireEvent.click(runButton)

    // Button should show "Running..." and be disabled
    expect(screen.getByRole('button', { name: /running/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /running/i })).toBeDisabled()
  })

  it('handles code changes properly', async () => {
    const user = userEvent.setup()
    render(<CodeEditor />)

    const editor = screen.getByTestId('monaco-editor')

    // Clear and enter new code
    await user.clear(editor)
    await user.type(editor, 'x = 5\nprint(x)')

    expect(editor).toHaveValue('x = 5\nprint(x)')
  })

  it('displays output in pre-formatted text', async () => {
    render(<CodeEditor />)

    // Wait for initialization
    await waitFor(
      () => {
        expect(
          screen.getByText('Python environment ready! 🐍')
        ).toBeInTheDocument()
      },
      { timeout: 1000 }
    )

    // Check that output area uses pre formatting
    const outputArea = screen
      .getByText('Python environment ready! 🐍')
      .closest('pre')
    expect(outputArea).toHaveClass(
      'text-sm',
      'font-mono',
      'whitespace-pre-wrap'
    )
  })

  // New tests for streaming output functionality
  it('streams multiple print statements progressively', async () => {
    render(<CodeEditor />)

    // Wait for worker to be ready
    await waitFor(
      () => {
        expect(
          screen.getByText('Python environment ready! 🐍')
        ).toBeInTheDocument()
      },
      { timeout: 1000 }
    )

    // Change code to have multiple print statements
    const editor = screen.getByTestId('monaco-editor')
    await userEvent.clear(editor)
    await userEvent.type(
      editor,
      'print("First")\nprint("Second")\nprint("Third")'
    )

    const runButton = screen.getByRole('button', { name: /run/i })
    fireEvent.click(runButton)

    // Wait for all streaming outputs to appear
    await waitFor(
      () => {
        expect(screen.getByText(/First/)).toBeInTheDocument()
        expect(screen.getByText(/Second/)).toBeInTheDocument()
        expect(screen.getByText(/Third/)).toBeInTheDocument()
      },
      { timeout: 2000 }
    )
  })

  it('clears output when starting new execution', async () => {
    render(<CodeEditor />)

    // Wait for worker to be ready
    await waitFor(
      () => {
        expect(
          screen.getByText('Python environment ready! 🐍')
        ).toBeInTheDocument()
      },
      { timeout: 1000 }
    )

    const runButton = screen.getByRole('button', { name: /run/i })

    // First execution
    fireEvent.click(runButton)

    // Wait for output
    await waitFor(
      () => {
        expect(screen.getByText('Hello, World!')).toBeInTheDocument()
      },
      { timeout: 1500 }
    )

    // Wait for execution to complete
    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: /run/i })).not.toBeDisabled()
      },
      { timeout: 2000 }
    )

    // Second execution should clear previous output
    fireEvent.click(runButton)

    // Output should be cleared immediately
    expect(screen.queryByText('Hello, World!')).not.toBeInTheDocument()
  })

  it('executes code without print statements', async () => {
    render(<CodeEditor />)

    // Wait for worker to be ready
    await waitFor(
      () => {
        expect(
          screen.getByText('Python environment ready! 🐍')
        ).toBeInTheDocument()
      },
      { timeout: 1000 }
    )

    // Change code to have no print statements
    const editor = screen.getByTestId('monaco-editor')
    await userEvent.clear(editor)
    await userEvent.type(editor, 'x = 5\ny = 10\nz = x + y')

    const runButton = screen.getByRole('button', { name: /run/i })
    fireEvent.click(runButton)

    // Should complete execution without any output
    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: /run/i })).not.toBeDisabled()
      },
      { timeout: 1500 }
    )

    // Output area should be empty - no print output should be visible
    expect(screen.queryByText('5')).not.toBeInTheDocument()
    expect(screen.queryByText('10')).not.toBeInTheDocument()
  })

  it('has scrollable output area with proper styling', async () => {
    render(<CodeEditor />)

    // Wait for initialization
    await waitFor(
      () => {
        expect(
          screen.getByText('Python environment ready! 🐍')
        ).toBeInTheDocument()
      },
      { timeout: 1000 }
    )

    // Check that output area has scrolling capabilities
    const outputContainer = screen
      .getByText('Python environment ready! 🐍')
      .closest('div')
    expect(outputContainer).toHaveClass('overflow-y-auto', 'max-h-96')
  })
})
