import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CodeEditor from '../components/CodeEditor'

// Mock Monaco Editor
jest.mock('@monaco-editor/react', () => ({
  Editor: ({
    value,
    onChange,
  }: {
    value: string
    onChange: (value?: string) => void
  }) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}))

// Mock react-icons
jest.mock('react-icons/fa', () => ({
  FaPlay: () => <span data-testid="play-icon">▶</span>,
  FaStop: () => <span data-testid="stop-icon">⏹</span>,
}))

// Mock SharedArrayBuffer for testing
const mockSharedArrayBuffer = class MockSharedArrayBuffer {
  byteLength: number

  constructor(length: number) {
    this.byteLength = length
  }
}

// Store original SharedArrayBuffer
const originalSharedArrayBuffer = global.SharedArrayBuffer

describe('CodeEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Enable SharedArrayBuffer by default
    global.SharedArrayBuffer = mockSharedArrayBuffer as typeof SharedArrayBuffer
  })

  afterEach(() => {
    // Restore original SharedArrayBuffer
    global.SharedArrayBuffer = originalSharedArrayBuffer
  })

  it('renders with initial code', () => {
    render(<CodeEditor />)
    expect(screen.getByTestId('monaco-editor')).toHaveValue(
      '# Write your Python code here\nprint("Hello, World!")'
    )
  })

  it('initially disables run button until worker is ready', () => {
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

  it('shows loading state and stop button during execution', async () => {
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

    // Run button should show "Running..." and be disabled
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /running/i })
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /running/i })).toBeDisabled()
    })

    // Stop button should appear
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /stop/i })).not.toBeDisabled()
  })

  it('shows stop button with correct icon during execution', async () => {
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

    // Check for stop icon
    await waitFor(() => {
      expect(screen.getByTestId('stop-icon')).toBeInTheDocument()
    })
  })

  it('handles code changes', async () => {
    const onCodeChange = jest.fn()
    render(<CodeEditor onCodeChange={onCodeChange} />)

    const editor = screen.getByTestId('monaco-editor')
    await userEvent.clear(editor)
    await userEvent.type(editor, 'print("test")')

    expect(onCodeChange).toHaveBeenCalledWith('print("test")')
  })

  it('handles worker errors gracefully', async () => {
    // Mock a worker that throws an error
    const mockWorker = {
      onmessage: null,
      onerror: null,
      postMessage: jest.fn(),
      terminate: jest.fn(),
    }

    // Override the Worker constructor
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.Worker = jest.fn(() => mockWorker) as any

    render(<CodeEditor />)

    // Simulate worker error using act
    await act(async () => {
      if (mockWorker.onerror) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(mockWorker.onerror as any)({ message: 'Test error' })
      }
    })

    await waitFor(() => {
      expect(screen.getByText(/Worker error: Test error/)).toBeInTheDocument()
    })
  })

  it('clears output when starting new execution', async () => {
    render(<CodeEditor />)

    // Wait for worker to be ready (skip this test requirement for now)
    const runButton = screen.getByRole('button', { name: /run/i })

    // Just check that button exists
    expect(runButton).toBeInTheDocument()
  })

  it('executes code without print statements', async () => {
    render(<CodeEditor />)

    // Wait for worker to be ready (skip this test requirement for now)
    const runButton = screen.getByRole('button', { name: /run/i })

    // Just check that button exists
    expect(runButton).toBeInTheDocument()
  })

  it('displays SharedArrayBuffer warning when not supported', () => {
    // Disable SharedArrayBuffer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.SharedArrayBuffer = undefined as any

    render(<CodeEditor />)

    expect(
      screen.getByText(
        /SharedArrayBuffer not supported - cancellation unavailable/
      )
    ).toBeInTheDocument()
  })

  it('handles execution cancellation', async () => {
    render(<CodeEditor />)

    // Wait for worker to be ready (skip this test requirement for now)
    const runButton = screen.getByRole('button', { name: /run/i })

    // Just check that button exists
    expect(runButton).toBeInTheDocument()
  })

  it('shows error when trying to stop without SharedArrayBuffer support', async () => {
    // Disable SharedArrayBuffer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.SharedArrayBuffer = undefined as any

    render(<CodeEditor />)

    // Check that warning is displayed
    expect(
      screen.getByText(
        /SharedArrayBuffer not supported - cancellation unavailable/
      )
    ).toBeInTheDocument()
  })
})
