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

  // Helper method to simulate error
  simulateError(error: ErrorEvent) {
    if (this.onerror) {
      this.onerror(error);
    }
  }
}

// Mock the Worker constructor
global.Worker = vi.fn(() => new MockWorker()) as unknown as typeof Worker;

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

    // Simulate output from worker
    act(() => {
      mockWorker.simulateMessage({
        type: 'output',
        id: expect.any(String),
        content: 'hello\\n',
      });
    });

    expect(mockOnOutputChange).toHaveBeenCalledWith(['hello\\n'], null);
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
});
