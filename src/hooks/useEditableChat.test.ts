import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditableChat } from './useEditableChat';
import { useEditStore } from '../store/editStore';

// Mock the useAiChat hook
const mockSetMessages = vi.fn();
const mockSendMessage = vi.fn();

vi.mock('./useAiChat', () => ({
  useAiChat: vi.fn(() => ({
    messages: [
      {
        role: 'user',
        parts: [{ type: 'text', text: 'Hello' }],
        createdAt: new Date('2024-01-01T00:00:00Z'),
      },
      {
        role: 'assistant',
        parts: [{ type: 'text', text: 'Hi there!' }],
        createdAt: new Date('2024-01-01T00:01:00Z'),
      },
      {
        role: 'user',
        parts: [{ type: 'text', text: 'Another message' }],
        createdAt: new Date('2024-01-01T00:02:00Z'),
      },
    ],
    isLoading: false,
    error: null,
    hasApiKey: true,
    sendMessage: mockSendMessage,
    setMessages: mockSetMessages,
  })),
}));

describe('useEditableChat', () => {
  beforeEach(() => {
    useEditStore.getState().setEditingMessageId(null);
    vi.clearAllMocks();
    mockSetMessages.mockClear();
    mockSendMessage.mockClear();
  });

  it('should create messages with stable IDs', () => {
    const { result } = renderHook(() => useEditableChat());

    expect(result.current.messages).toHaveLength(3);
    expect(result.current.messages[0]).toMatchObject({
      id: expect.stringMatching(/^msg-0-\d+$/),
      role: 'user',
    });
    expect(result.current.messages[1]).toMatchObject({
      id: expect.stringMatching(/^msg-1-\d+$/),
      role: 'assistant',
    });
    expect(result.current.messages[2]).toMatchObject({
      id: expect.stringMatching(/^msg-2-\d+$/),
      role: 'user',
    });
  });

  it('should start editing a message', () => {
    const { result } = renderHook(() => useEditableChat());

    act(() => {
      result.current.startEditing('test-id');
    });

    expect(result.current.editingMessageId).toBe('test-id');
  });

  it('should cancel editing', () => {
    const { result } = renderHook(() => useEditableChat());

    act(() => {
      result.current.startEditing('test-id');
    });

    act(() => {
      result.current.cancelEditing();
    });

    expect(result.current.editingMessageId).toBe(null);
  });

  it('should rollback and edit message, deleting subsequent messages', async () => {
    const { result } = renderHook(() => useEditableChat());

    // Start editing the first message (index 0)
    act(() => {
      result.current.startEditing(result.current.messages[0].id);
    });

    // Rollback should delete messages after index 0 and send new message
    await act(async () => {
      await result.current.rollbackAndEdit(
        result.current.messages[0].id,
        'New text',
      );
    });

    // Verify editing state is cleared
    expect(result.current.editingMessageId).toBe(null);

    // Verify setMessages was called with messages up to (but not including) the edited message
    expect(mockSetMessages).toHaveBeenCalledWith([]); // No messages before index 0

    // Verify sendMessage was called with the new text
    expect(mockSendMessage).toHaveBeenCalledWith('New text');
  });

  it('should rollback and edit middle message, keeping earlier messages', async () => {
    const { result } = renderHook(() => useEditableChat());

    // Start editing the second message (index 1)
    act(() => {
      result.current.startEditing(result.current.messages[1].id);
    });

    // Rollback should keep message at index 0, delete messages after index 1
    await act(async () => {
      await result.current.rollbackAndEdit(
        result.current.messages[1].id,
        'Edited assistant response',
      );
    });

    // Verify editing state is cleared
    expect(result.current.editingMessageId).toBe(null);

    // Verify setMessages was called with only the first message
    expect(mockSetMessages).toHaveBeenCalledWith([
      {
        role: 'user',
        parts: [{ type: 'text', text: 'Hello' }],
        createdAt: new Date('2024-01-01T00:00:00Z'),
      },
    ]);

    // Verify sendMessage was called with the new text
    expect(mockSendMessage).toHaveBeenCalledWith('Edited assistant response');
  });
});
