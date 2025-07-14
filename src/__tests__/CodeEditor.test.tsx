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

  it('executes code and shows output', async () => {
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

    // Should show "Running..." in both button and output area
    const runningElements = screen.getAllByText('Running...')
    expect(runningElements.length).toBe(2) // Button and output

    // Wait for mock result (our jest.setup.js mock returns "Mock output for: [code]")
    await waitFor(
      () => {
        expect(screen.getByText(/Mock output for:/)).toBeInTheDocument()
      },
      { timeout: 1000 }
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
})
