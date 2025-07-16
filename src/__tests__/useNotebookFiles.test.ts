import { renderHook, act } from '@testing-library/react';
import { useNotebookFiles } from '../hooks/useNotebookFiles';
import localforage from 'localforage';

// Mock localforage
jest.mock('localforage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: () => 'test-uuid',
}));

describe('useNotebookFiles', () => {
  beforeEach(() => {
    (localforage.getItem as jest.Mock).mockClear();
    (localforage.setItem as jest.Mock).mockClear();
  });

  it('should load files from localforage on initial render', async () => {
    const mockFiles = { '1': { id: '1', title: 'Test File', cells: [], messages: [], createdAt: '', updatedAt: '' } };
    (localforage.getItem as jest.Mock).mockResolvedValueOnce(mockFiles);
    (localforage.getItem as jest.Mock).mockResolvedValueOnce('1');

    const { result } = renderHook(() => useNotebookFiles());

    await act(async () => {
        await Promise.resolve();
    });

    expect(result.current.files).toEqual([mockFiles['1']]);
    expect(result.current.activeFileId).toBe('1');
    expect(localforage.getItem).toHaveBeenCalledWith('notebookFiles');
    expect(localforage.getItem).toHaveBeenCalledWith('lastActiveFileId');
  });

  it('should create a new file', async () => {
    const { result } = renderHook(() => useNotebookFiles());

    await act(async () => {
        await Promise.resolve();
    });

    await act(async () => {
      result.current.createNewFile();
    });

    expect(result.current.files.length).toBe(1);
    expect(result.current.files[0].title).toBe('Untitled');
    expect(result.current.activeFileId).toBe('test-uuid');
    expect(localforage.setItem).toHaveBeenCalledWith('notebookFiles', {
      'test-uuid': expect.any(Object),
    });
    expect(localforage.setItem).toHaveBeenCalledWith('lastActiveFileId', 'test-uuid');
  });

  it('should update the active file', async () => {
    const mockFiles = { '1': { id: '1', title: 'Test File', cells: [], messages: [], createdAt: '', updatedAt: '' } };
    (localforage.getItem as jest.Mock).mockResolvedValueOnce(mockFiles);
    (localforage.getItem as jest.Mock).mockResolvedValueOnce('1');

    const { result } = renderHook(() => useNotebookFiles());

    await act(async () => {
        await Promise.resolve();
    });

    act(() => {
        result.current.selectFile('1');
    });

    await act(async () => {
      result.current.updateActiveFile({ title: 'Updated Title' });
    });

    expect(result.current.files[0].title).toBe('Updated Title');
  });

  it('should select a file', async () => {
    const { result } = renderHook(() => useNotebookFiles());

    await act(async () => {
        await Promise.resolve();
    });

    await act(async () => {
        result.current.selectFile('file-2');
    });

    expect(result.current.activeFileId).toBe('file-2');
    expect(localforage.setItem).toHaveBeenCalledWith('lastActiveFileId', 'file-2');
  });
});
