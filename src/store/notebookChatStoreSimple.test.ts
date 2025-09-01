import { describe, it, expect, beforeEach } from 'vitest';
import { useNotebookChatStoreSimple } from './notebookChatStoreSimple';
import type { AiChatMessage } from '../types/ai-chat';

describe('notebookChatStoreSimple', () => {
  beforeEach(() => {
    // Reset store state
    useNotebookChatStoreSimple.setState({ 
      messagesByFile: {},
      activeFileId: null,
      isLoadingMessages: false
    });
  });

  it('should handle file switching without race conditions', () => {
    const store = useNotebookChatStoreSimple.getState();
    
    const file1Messages: AiChatMessage[] = [
      {
        id: 'msg1',
        role: 'user',
        content: 'Hello from file 1',
        parts: [],
        toolInvocations: [],
      },
    ];

    const file2Messages: AiChatMessage[] = [
      {
        id: 'msg2',
        role: 'user',
        content: 'Hello from file 2',
        parts: [],
        toolInvocations: [],
      },
    ];

    // Switch to file1 with its messages
    store.switchToFile('file1', file1Messages);
    let currentState = useNotebookChatStoreSimple.getState();
    expect(currentState.getCurrentMessages()).toEqual(file1Messages);
    expect(currentState.activeFileId).toBe('file1');

    // Switch to file2 with its messages
    store.switchToFile('file2', file2Messages);
    currentState = useNotebookChatStoreSimple.getState();
    expect(currentState.getCurrentMessages()).toEqual(file2Messages);
    expect(currentState.activeFileId).toBe('file2');

    // Messages for file1 should still be preserved
    expect(currentState.getMessagesForFile('file1')).toEqual(file1Messages);
    expect(currentState.getMessagesForFile('file2')).toEqual(file2Messages);
  });

  it('should handle switching to empty files correctly', () => {
    const store = useNotebookChatStoreSimple.getState();
    
    // Start with a file that has messages
    const existingMessages: AiChatMessage[] = [
      {
        id: 'msg1',
        role: 'user',
        content: 'Existing message',
        parts: [],
        toolInvocations: [],
      },
    ];

    store.switchToFile('file1', existingMessages);
    let currentState = useNotebookChatStoreSimple.getState();
    expect(currentState.getCurrentMessages()).toEqual(existingMessages);

    // Switch to a new empty file
    store.switchToFile('file2', []); // Empty messages array
    currentState = useNotebookChatStoreSimple.getState();
    expect(currentState.getCurrentMessages()).toEqual([]); // Should be empty
    expect(currentState.activeFileId).toBe('file2');

    // The original file should still have its messages
    expect(currentState.getMessagesForFile('file1')).toEqual(existingMessages);
  });

  it('should update messages for the current file only', () => {
    const store = useNotebookChatStoreSimple.getState();
    
    const file1Messages: AiChatMessage[] = [
      {
        id: 'msg1',
        role: 'user',
        content: 'Original message',
        parts: [],
        toolInvocations: [],
      },
    ];

    const file2Messages: AiChatMessage[] = [
      {
        id: 'msg2',
        role: 'user',
        content: 'Other file message',
        parts: [],
        toolInvocations: [],
      },
    ];

    // Set up two files
    store.switchToFile('file1', file1Messages);
    store.switchToFile('file2', file2Messages);

    // Go back to file1
    store.switchToFile('file1', file1Messages);

    // Update messages for file1
    const updatedMessages: AiChatMessage[] = [
      ...file1Messages,
      {
        id: 'msg3',
        role: 'assistant',
        content: 'New message for file1',
        parts: [],
        toolInvocations: [],
      },
    ];

    store.updateMessages(updatedMessages);
    let currentState = useNotebookChatStoreSimple.getState();

    // File1 should have updated messages
    expect(currentState.getCurrentMessages()).toEqual(updatedMessages);
    expect(currentState.getMessagesForFile('file1')).toEqual(updatedMessages);

    // File2 should be unchanged
    expect(currentState.getMessagesForFile('file2')).toEqual(file2Messages);
  });

  it('should handle null file IDs correctly', () => {
    const store = useNotebookChatStoreSimple.getState();
    
    // Start with a file
    store.switchToFile('file1', [
      {
        id: 'msg1',
        role: 'user',
        content: 'Message',
        parts: [],
        toolInvocations: [],
      },
    ]);

    // Switch to no file
    store.switchToFile(null);
    let currentState = useNotebookChatStoreSimple.getState();
    expect(currentState.activeFileId).toBe(null);
    expect(currentState.getCurrentMessages()).toEqual([]);

    // Updating messages when no file is active should not crash
    store.updateMessages([
      {
        id: 'msg2',
        role: 'user',
        content: 'Should not be stored',
        parts: [],
        toolInvocations: [],
      },
    ]);

    currentState = useNotebookChatStoreSimple.getState();
    expect(currentState.getCurrentMessages()).toEqual([]);
  });
});