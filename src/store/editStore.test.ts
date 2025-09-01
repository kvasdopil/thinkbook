import { describe, it, expect, beforeEach } from 'vitest';
import { useEditStore } from './editStore';

describe('editStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    useEditStore.getState().setEditingMessageId(null);
  });

  it('should initialize with null editingMessageId', () => {
    const { editingMessageId } = useEditStore.getState();
    expect(editingMessageId).toBe(null);
  });

  it('should set editingMessageId', () => {
    const { setEditingMessageId } = useEditStore.getState();
    setEditingMessageId('test-message-id');

    const { editingMessageId } = useEditStore.getState();
    expect(editingMessageId).toBe('test-message-id');
  });

  it('should clear editingMessageId', () => {
    const { setEditingMessageId } = useEditStore.getState();
    setEditingMessageId('test-message-id');
    setEditingMessageId(null);

    const { editingMessageId } = useEditStore.getState();
    expect(editingMessageId).toBe(null);
  });
});
