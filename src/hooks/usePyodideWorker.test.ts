import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { usePyodideWorker } from './usePyodideWorker';

// Mock Worker
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((error: ErrorEvent) => void) | null = null;

  postMessage = vi.fn();
  terminate = vi.fn();

  // Helper method to simulate messages from worker
  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
  }

  // Helper to get the last message ID sent
  getLastExecutionMessageId(): string {
    const lastCall = this.postMessage.mock.calls
      .reverse()
      .find((call) => call[0]?.type === 'execute');
    return lastCall?.[0]?.id || 'unknown';
  }

  // Helper method to simulate error
  simulateError(error: ErrorEvent) {
    if (this.onerror) {
      this.onerror(error);
    }
  }
}

// Mock the Worker constructor
global.Worker = vi.fn(() => new MockWorker()) as unknown as typeof Worker;

// Mock SharedArrayBuffer
class MockSharedArrayBuffer {
  constructor(public length: number) {}
}

// Mock Uint8Array with SharedArrayBuffer
class MockUint8Array extends Uint8Array {
  constructor(bufferOrLength: ArrayBuffer | SharedArrayBuffer | number) {
    if (typeof bufferOrLength === 'number') {
      super(bufferOrLength);
    } else {
      super(
        bufferOrLength instanceof MockSharedArrayBuffer
          ? new ArrayBuffer(bufferOrLength.length)
          : bufferOrLength,
      );
    }
  }
}

describe('usePyodideWorker', () => {
  let mockWorker: MockWorker;

  beforeEach(() => {
    vi.clearAllMocks();
    // Get the mock worker instance
    mockWorker = new MockWorker();
    (global.Worker as ReturnType<typeof vi.fn>).mockImplementation(
      () => mockWorker,
    );
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('initializes worker on mount', () => {
    renderHook(() => usePyodideWorker());

    expect(global.Worker).toHaveBeenCalledWith(expect.any(URL), {
      type: 'module',
    });
    expect(mockWorker.postMessage).toHaveBeenCalledWith({
      type: 'init',
      id: 'init',
    });
  });

  it('sets isReady to true when worker sends ready message', async () => {
    const { result } = renderHook(() => usePyodideWorker());

    expect(result.current.isReady).toBe(false);

    act(() => {
      mockWorker.simulateMessage({
        type: 'ready',
        id: 'init',
      });
    });

    expect(result.current.isReady).toBe(true);
  });

  it('calls onOutputChange when output is received', async () => {
    const mockOnOutputChange = vi.fn();
    const { result } = renderHook(() =>
      usePyodideWorker({
        onOutputChange: mockOnOutputChange,
      }),
    );

    // Make worker ready first
    act(() => {
      mockWorker.simulateMessage({ type: 'ready', id: 'init' });
    });

    // Execute code
    act(() => {
      void result.current.executeCode('print("hello")');
    });

    // Get the messageId that was sent
    const executeCall = mockWorker.postMessage.mock.calls.find(
      (call) => call[0].type === 'execute',
    );
    const messageId = executeCall![0].id;

    // Simulate output from worker
    act(() => {
      mockWorker.simulateMessage({
        type: 'output',
        id: messageId,
        content: 'hello\\n',
      });
    });

    expect(mockOnOutputChange).toHaveBeenCalledWith(['hello\\n'], null);
  });

  it('handles streaming output with "out" message type', async () => {
    const mockOnOutputChange = vi.fn();
    const { result } = renderHook(() =>
      usePyodideWorker({
        onOutputChange: mockOnOutputChange,
      }),
    );

    // Make worker ready first
    act(() => {
      mockWorker.simulateMessage({ type: 'ready', id: 'init' });
    });

    // Execute code
    act(() => {
      void result.current.executeCode('print("hello")');
    });

    // Get the messageId that was sent
    const executeCall = mockWorker.postMessage.mock.calls.find(
      (call) => call[0].type === 'execute',
    );
    const messageId = executeCall![0].id;

    // Simulate streaming stdout from worker
    act(() => {
      mockWorker.simulateMessage({
        type: 'out',
        id: messageId,
        value: 'hello\\n',
      });
    });

    expect(mockOnOutputChange).toHaveBeenCalledWith(['hello\\n'], null);
  });

  it('handles streaming error output with "err" message type', async () => {
    const mockOnOutputChange = vi.fn();
    const { result } = renderHook(() =>
      usePyodideWorker({
        onOutputChange: mockOnOutputChange,
      }),
    );

    // Make worker ready first
    act(() => {
      mockWorker.simulateMessage({ type: 'ready', id: 'init' });
    });

    // Execute code
    act(() => {
      void result.current.executeCode(
        'import sys; print("error", file=sys.stderr)',
      );
    });

    // Simulate streaming stderr from worker
    act(() => {
      mockWorker.simulateMessage({
        type: 'err',
        id: expect.any(String),
        value: 'error\\n',
      });
    });

    expect(mockOnOutputChange).toHaveBeenCalledWith(['error\\n'], null);
  });

  it('accumulates multiple streaming output messages', async () => {
    const mockOnOutputChange = vi.fn();
    const { result } = renderHook(() =>
      usePyodideWorker({
        onOutputChange: mockOnOutputChange,
      }),
    );

    // Make worker ready first
    act(() => {
      mockWorker.simulateMessage({ type: 'ready', id: 'init' });
    });

    // Execute code
    act(() => {
      void result.current.executeCode('print("line1")\\nprint("line2")');
    });

    // Simulate first streaming output
    act(() => {
      mockWorker.simulateMessage({
        type: 'out',
        id: expect.any(String),
        value: 'line1\\n',
      });
    });

    expect(mockOnOutputChange).toHaveBeenCalledWith(['line1\\n'], null);

    // Simulate second streaming output
    act(() => {
      mockWorker.simulateMessage({
        type: 'out',
        id: expect.any(String),
        value: 'line2\\n',
      });
    });

    expect(mockOnOutputChange).toHaveBeenCalledWith(
      ['line1\\n', 'line2\\n'],
      null,
    );
  });

  it('handles mixed stdout and stderr streaming', async () => {
    const mockOnOutputChange = vi.fn();
    const { result } = renderHook(() =>
      usePyodideWorker({
        onOutputChange: mockOnOutputChange,
      }),
    );

    // Make worker ready first
    act(() => {
      mockWorker.simulateMessage({ type: 'ready', id: 'init' });
    });

    // Execute code
    act(() => {
      void result.current.executeCode(
        'print("stdout")\\nimport sys; print("stderr", file=sys.stderr)',
      );
    });

    // Simulate stdout
    act(() => {
      mockWorker.simulateMessage({
        type: 'out',
        id: expect.any(String),
        value: 'stdout\\n',
      });
    });

    expect(mockOnOutputChange).toHaveBeenCalledWith(['stdout\\n'], null);

    // Simulate stderr
    act(() => {
      mockWorker.simulateMessage({
        type: 'err',
        id: expect.any(String),
        value: 'stderr\\n',
      });
    });

    expect(mockOnOutputChange).toHaveBeenCalledWith(
      ['stdout\\n', 'stderr\\n'],
      null,
    );
  });

  it('handles execution errors correctly', async () => {
    const mockOnOutputChange = vi.fn();
    const { result } = renderHook(() =>
      usePyodideWorker({
        onOutputChange: mockOnOutputChange,
      }),
    );

    // Make worker ready first
    act(() => {
      mockWorker.simulateMessage({ type: 'ready', id: 'init' });
    });

    // Execute code that will error
    act(() => {
      void result.current.executeCode('invalid_code');
    });

    // Simulate error from worker
    act(() => {
      mockWorker.simulateMessage({
        type: 'error',
        id: expect.any(String),
        error: 'SyntaxError: invalid syntax',
      });
    });

    expect(mockOnOutputChange).toHaveBeenCalledWith(
      [],
      'SyntaxError: invalid syntax',
    );
  });

  it('returns error when worker is not ready', async () => {
    const { result } = renderHook(() => usePyodideWorker());

    const executionResult = await result.current.executeCode('print("hello")');

    expect(executionResult).toEqual({
      output: [],
      error: 'Worker is not ready',
      isComplete: false,
    });
  });

  it('sets isExecuting correctly during execution', async () => {
    const { result } = renderHook(() => usePyodideWorker());

    // Make worker ready first
    act(() => {
      mockWorker.simulateMessage({ type: 'ready', id: 'init' });
    });

    expect(result.current.isExecuting).toBe(false);

    // Start execution
    act(() => {
      void result.current.executeCode('print("hello")');
    });

    expect(result.current.isExecuting).toBe(true);

    // Complete execution
    act(() => {
      mockWorker.simulateMessage({
        type: 'complete',
        id: expect.any(String),
      });
    });

    await waitFor(() => {
      expect(result.current.isExecuting).toBe(false);
    });
  });

  it('terminates worker on unmount', () => {
    const { unmount } = renderHook(() => usePyodideWorker());

    unmount();

    expect(mockWorker.terminate).toHaveBeenCalled();
  });

  describe('execution cancellation', () => {
    beforeEach(() => {
      // Mock SharedArrayBuffer support
      global.SharedArrayBuffer =
        MockSharedArrayBuffer as unknown as typeof SharedArrayBuffer;
      global.Uint8Array = MockUint8Array as typeof Uint8Array;
    });

    afterEach(() => {
      // Restore original implementations
      delete (global as { SharedArrayBuffer?: unknown }).SharedArrayBuffer;
      global.Uint8Array = Uint8Array;
    });

    it('detects SharedArrayBuffer support', () => {
      const { result } = renderHook(() => usePyodideWorker());

      expect(result.current.supportsSharedArrayBuffer).toBe(true);
    });

    it('detects SharedArrayBuffer unavailability', () => {
      // Remove SharedArrayBuffer support
      delete (global as { SharedArrayBuffer?: unknown }).SharedArrayBuffer;

      const { result } = renderHook(() => usePyodideWorker());

      expect(result.current.supportsSharedArrayBuffer).toBe(false);
    });

    it('sends interrupt buffer to worker when ready with SharedArrayBuffer support', async () => {
      renderHook(() => usePyodideWorker());

      // Make worker ready
      act(() => {
        mockWorker.simulateMessage({ type: 'ready', id: 'init' });
      });

      // Check that setInterruptBuffer message was sent
      await waitFor(() => {
        expect(mockWorker.postMessage).toHaveBeenCalledWith({
          type: 'setInterruptBuffer',
          id: 'interrupt-buffer',
          buffer: expect.any(MockSharedArrayBuffer),
        });
      });
    });

    it('handles execution cancellation with SharedArrayBuffer', async () => {
      const mockOnOutputChange = vi.fn();
      const { result } = renderHook(() =>
        usePyodideWorker({
          onOutputChange: mockOnOutputChange,
        }),
      );

      // Make worker ready first
      act(() => {
        mockWorker.simulateMessage({ type: 'ready', id: 'init' });
      });

      // Start execution
      act(() => {
        void result.current.executeCode('while True: pass');
      });

      expect(result.current.executionState).toBe('running');

      // Interrupt execution
      act(() => {
        result.current.interruptExecution();
      });

      expect(result.current.executionState).toBe('stopping');

      // Simulate cancellation response from worker
      act(() => {
        mockWorker.simulateMessage({
          type: 'cancelled',
          id: expect.any(String),
        });
      });

      expect(result.current.executionState).toBe('cancelled');
      expect(mockOnOutputChange).toHaveBeenCalledWith(
        [],
        'Execution interrupted by user',
      );
    });

    it('uses fallback interruption when SharedArrayBuffer unavailable', async () => {
      // Remove SharedArrayBuffer support
      delete (global as { SharedArrayBuffer?: unknown }).SharedArrayBuffer;

      const { result } = renderHook(() => usePyodideWorker());

      // Make worker ready first
      act(() => {
        mockWorker.simulateMessage({ type: 'ready', id: 'init' });
      });

      // Start execution
      act(() => {
        void result.current.executeCode('while True: pass');
      });

      expect(result.current.executionState).toBe('running');

      // Interrupt execution
      act(() => {
        result.current.interruptExecution();
      });

      expect(result.current.executionState).toBe('stopping');

      // Check that fallback interrupt message was sent
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'interrupt',
        id: 'interrupt-fallback',
      });

      // Should automatically transition to cancelled state after timeout
      await waitFor(() => {
        expect(result.current.executionState).toBe('cancelled');
      });
    });

    it('handles race condition between cancellation and natural completion', async () => {
      const mockOnOutputChange = vi.fn();
      const { result } = renderHook(() =>
        usePyodideWorker({
          onOutputChange: mockOnOutputChange,
        }),
      );

      // Make worker ready first
      act(() => {
        mockWorker.simulateMessage({ type: 'ready', id: 'init' });
      });

      // Start execution
      act(() => {
        void result.current.executeCode('print("hello")');
      });

      expect(result.current.executionState).toBe('running');

      // Interrupt execution
      act(() => {
        result.current.interruptExecution();
      });

      expect(result.current.executionState).toBe('stopping');

      // Simulate natural completion before cancellation
      act(() => {
        mockWorker.simulateMessage({
          type: 'complete',
          id: expect.any(String),
        });
      });

      // Should complete normally, not be cancelled
      expect(result.current.executionState).toBe('idle');
    });

    it('properly transitions execution states', () => {
      const { result } = renderHook(() => usePyodideWorker());

      // Initial state
      expect(result.current.executionState).toBe('idle');
      expect(result.current.isExecuting).toBe(false);

      // Make worker ready first
      act(() => {
        mockWorker.simulateMessage({ type: 'ready', id: 'init' });
      });

      // Start execution
      act(() => {
        void result.current.executeCode('print("hello")');
      });

      expect(result.current.executionState).toBe('running');
      expect(result.current.isExecuting).toBe(true);

      // Interrupt
      act(() => {
        result.current.interruptExecution();
      });

      expect(result.current.executionState).toBe('stopping');
      expect(result.current.isExecuting).toBe(true); // Still executing until cancelled

      // Complete cancellation
      act(() => {
        mockWorker.simulateMessage({
          type: 'cancelled',
          id: expect.any(String),
        });
      });

      expect(result.current.executionState).toBe('cancelled');
      expect(result.current.isExecuting).toBe(false);
    });

    it('resets execution state after cancellation', async () => {
      const { result } = renderHook(() => usePyodideWorker());

      // Make worker ready first
      act(() => {
        mockWorker.simulateMessage({ type: 'ready', id: 'init' });
      });

      // Execute and cancel
      act(() => {
        void result.current.executeCode('while True: pass');
      });

      act(() => {
        result.current.interruptExecution();
      });

      act(() => {
        mockWorker.simulateMessage({
          type: 'cancelled',
          id: expect.any(String),
        });
      });

      expect(result.current.executionState).toBe('cancelled');

      // Should be able to execute again
      act(() => {
        void result.current.executeCode('print("hello")');
      });

      expect(result.current.executionState).toBe('running');
    });
  });
});
