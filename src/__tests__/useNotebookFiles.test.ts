import { renderHook, act } from '@testing-library/react'
import { useNotebookFiles } from '../hooks/useNotebookFiles'
import localforage from 'localforage'

// Mock localforage
jest.mock('localforage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}))

// Mock uuid
jest.mock('uuid', () => ({
  v4: () => 'test-uuid',
}))

describe('useNotebookFiles', () => {
  beforeEach(() => {
    ;(localforage.getItem as jest.Mock).mockClear()
    ;(localforage.setItem as jest.Mock).mockClear()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should load files from localforage on initial render', async () => {
    const mockFiles = {
      '1': {
        id: '1',
        title: 'Test File',
        cells: [],
        messages: [],
        createdAt: '',
        updatedAt: '',
      },
    }
    ;(localforage.getItem as jest.Mock).mockResolvedValueOnce(mockFiles)
    ;(localforage.getItem as jest.Mock).mockResolvedValueOnce('1')

    const { result } = renderHook(() => useNotebookFiles())

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.files).toEqual([mockFiles['1']])
    expect(result.current.activeFileId).toBe('1')
    expect(localforage.getItem).toHaveBeenCalledWith('notebookFiles')
    expect(localforage.getItem).toHaveBeenCalledWith('lastActiveFileId')
  })

  it('should create a new file', async () => {
    const { result } = renderHook(() => useNotebookFiles())

    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      result.current.createNewFile()
    })

    expect(result.current.files.length).toBe(1)
    expect(result.current.files[0].title).toBe('Untitled')
    expect(result.current.activeFileId).toBe('test-uuid')
    expect(localforage.setItem).toHaveBeenCalledWith('notebookFiles', {
      'test-uuid': expect.any(Object),
    })
    expect(localforage.setItem).toHaveBeenCalledWith(
      'lastActiveFileId',
      'test-uuid'
    )
  })

  it('should update the active file', async () => {
    const mockFiles = {
      '1': {
        id: '1',
        title: 'Test File',
        cells: [],
        messages: [],
        createdAt: '',
        updatedAt: '',
      },
    }
    ;(localforage.getItem as jest.Mock).mockResolvedValueOnce(mockFiles)
    ;(localforage.getItem as jest.Mock).mockResolvedValueOnce('1')

    const { result } = renderHook(() => useNotebookFiles())

    await act(async () => {
      await Promise.resolve()
    })

    act(() => {
      result.current.selectFile('1')
    })

    await act(async () => {
      result.current.updateActiveFile({ title: 'Updated Title' })
    })

    expect(result.current.files[0].title).toBe('Updated Title')
  })

  it('should not update "updatedAt" if content is the same', async () => {
    const initialDate = new Date().toISOString()
    const mockFiles = {
      '1': {
        id: '1',
        title: 'Test File',
        cells: [],
        messages: [],
        createdAt: initialDate,
        updatedAt: initialDate,
      },
    }
    ;(localforage.getItem as jest.Mock).mockResolvedValueOnce(mockFiles)
    ;(localforage.getItem as jest.Mock).mockResolvedValueOnce('1')

    const { result } = renderHook(() => useNotebookFiles())
    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      result.current.updateActiveFile({ title: 'Test File' })
    })

    expect(result.current.files[0].updatedAt).toBe(initialDate)
  })

  it('should update "updatedAt" when title changes', async () => {
    const initialDate = new Date('2023-01-01T00:00:00.000Z').toISOString()
    const mockFiles = {
      '1': {
        id: '1',
        title: 'Test File',
        cells: [],
        messages: [],
        createdAt: initialDate,
        updatedAt: initialDate,
      },
    }
    ;(localforage.getItem as jest.Mock).mockResolvedValueOnce(mockFiles)
    ;(localforage.getItem as jest.Mock).mockResolvedValueOnce('1')

    const { result } = renderHook(() => useNotebookFiles())
    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      jest.advanceTimersByTime(1000)
      result.current.updateActiveFile({ title: 'New Title' })
    })

    expect(result.current.files[0].updatedAt).not.toBe(initialDate)
  })

  it('should update "updatedAt" when cells change', async () => {
    const initialDate = new Date('2023-01-01T00:00:00.000Z').toISOString()
    const mockFiles = {
      '1': {
        id: '1',
        title: 'Test File',
        cells: [],
        messages: [],
        createdAt: initialDate,
        updatedAt: initialDate,
      },
    }
    ;(localforage.getItem as jest.Mock).mockResolvedValueOnce(mockFiles)
    ;(localforage.getItem as jest.Mock).mockResolvedValueOnce('1')

    const { result } = renderHook(() => useNotebookFiles())
    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      jest.advanceTimersByTime(1000)
      result.current.updateActiveFile({
        cells: [
          {
            id: 'cell1',
            type: 'code',
            text: 'new content',
            output: '',
            tables: [],
            isCodeVisible: false,
            executionStatus: 'idle',
            parentId: null,
          },
        ],
      })
    })

    expect(result.current.files[0].updatedAt).not.toBe(initialDate)
  })

  it('should update "updatedAt" when messages change', async () => {
    const initialDate = new Date('2023-01-01T00:00:00.000Z').toISOString()
    const mockFiles = {
      '1': {
        id: '1',
        title: 'Test File',
        cells: [],
        messages: [],
        createdAt: initialDate,
        updatedAt: initialDate,
      },
    }
    ;(localforage.getItem as jest.Mock).mockResolvedValueOnce(mockFiles)
    ;(localforage.getItem as jest.Mock).mockResolvedValueOnce('1')

    const { result } = renderHook(() => useNotebookFiles())
    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      jest.advanceTimersByTime(1000)
      result.current.updateActiveFile({
        messages: [
          {
            id: '1',
            role: 'user',
            content: 'new message',
            createdAt: new Date(),
          },
        ],
      })
    })

    expect(result.current.files[0].updatedAt).not.toBe(initialDate)
  })

  it('should not update "updatedAt" when code visibility changes', async () => {
    const initialDate = new Date().toISOString()
    const mockFiles = {
      '1': {
        id: '1',
        title: 'Test File',
        cells: [
          {
            id: 'cell1',
            type: 'code',
            text: '',
            output: '',
            tables: [],
            isCodeVisible: true,
            executionStatus: 'idle',
            parentId: null,
          },
        ],
        messages: [],
        createdAt: initialDate,
        updatedAt: initialDate,
      },
    }
    ;(localforage.getItem as jest.Mock).mockResolvedValueOnce(mockFiles)
    ;(localforage.getItem as jest.Mock).mockResolvedValueOnce('1')

    const { result } = renderHook(() => useNotebookFiles())
    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      result.current.updateActiveFile({
        cells: [
          {
            id: 'cell1',
            type: 'code',
            text: '',
            output: '',
            tables: [],
            isCodeVisible: true,
            executionStatus: 'idle',
            parentId: null,
          },
        ],
      })
    })

    expect(result.current.files[0].updatedAt).toBe(initialDate)
  })

  it('should not update "updatedAt" when execution status changes', async () => {
    const initialDate = new Date().toISOString()
    const mockFiles = {
      '1': {
        id: '1',
        title: 'Test File',
        cells: [
          {
            id: 'cell1',
            type: 'code',
            text: '',
            output: '',
            tables: [],
            isCodeVisible: false,
            executionStatus: 'running',
            parentId: null,
          },
        ],
        messages: [],
        createdAt: initialDate,
        updatedAt: initialDate,
      },
    }
    ;(localforage.getItem as jest.Mock).mockResolvedValueOnce(mockFiles)
    ;(localforage.getItem as jest.Mock).mockResolvedValueOnce('1')

    const { result } = renderHook(() => useNotebookFiles())
    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      result.current.updateActiveFile({
        cells: [
          {
            id: 'cell1',
            type: 'code',
            text: '',
            output: '',
            tables: [],
            isCodeVisible: false,
            executionStatus: 'running',
            parentId: null,
          },
        ],
      })
    })

    expect(result.current.files[0].updatedAt).toBe(initialDate)
  })

  it('should not update "updatedAt" when output changes', async () => {
    const initialDate = new Date().toISOString()
    const mockFiles = {
      '1': {
        id: '1',
        title: 'Test File',
        cells: [
          {
            id: 'cell1',
            type: 'code',
            text: '',
            output: 'new output',
            tables: [],
            isCodeVisible: false,
            executionStatus: 'idle',
            parentId: null,
          },
        ],
        messages: [],
        createdAt: initialDate,
        updatedAt: initialDate,
      },
    }
    ;(localforage.getItem as jest.Mock).mockResolvedValueOnce(mockFiles)
    ;(localforage.getItem as jest.Mock).mockResolvedValueOnce('1')

    const { result } = renderHook(() => useNotebookFiles())
    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      result.current.updateActiveFile({
        cells: [
          {
            id: 'cell1',
            type: 'code',
            text: '',
            output: 'new output',
            tables: [],
            isCodeVisible: false,
            executionStatus: 'idle',
            parentId: null,
          },
        ],
      })
    })

    expect(result.current.files[0].updatedAt).toBe(initialDate)
  })

  it('should select a file', async () => {
    const { result } = renderHook(() => useNotebookFiles())

    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      result.current.selectFile('file-2')
    })

    expect(result.current.activeFileId).toBe('file-2')
    expect(localforage.setItem).toHaveBeenCalledWith(
      'lastActiveFileId',
      'file-2'
    )
  })

  it('should delete a notebook and select the next most recent', async () => {
    const mockFiles = {
      '1': {
        id: '1',
        title: 'File 1',
        updatedAt: '2023-01-01T00:00:00.000Z',
        cells: [],
        messages: [],
        createdAt: '',
      },
      '2': {
        id: '2',
        title: 'File 2',
        updatedAt: '2023-01-02T00:00:00.000Z',
        cells: [],
        messages: [],
        createdAt: '',
      },
      '3': {
        id: '3',
        title: 'File 3',
        updatedAt: '2023-01-03T00:00:00.000Z',
        cells: [],
        messages: [],
        createdAt: '',
      },
    }
    ;(localforage.getItem as jest.Mock).mockResolvedValueOnce(mockFiles)
    ;(localforage.getItem as jest.Mock).mockResolvedValueOnce('3')

    const { result } = renderHook(() => useNotebookFiles())
    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.activeFileId).toBe('3')

    await act(async () => {
      result.current.deleteNotebook('3')
    })

    expect(result.current.files.length).toBe(2)
    expect(result.current.activeFileId).toBe('2') // Next most recent
  })

  it('should handle deleting the only notebook', async () => {
    const mockFiles = {
      '1': {
        id: '1',
        title: 'File 1',
        updatedAt: '2023-01-01T00:00:00.000Z',
        cells: [],
        messages: [],
        createdAt: '',
      },
    }
    ;(localforage.getItem as jest.Mock).mockResolvedValueOnce(mockFiles)
    ;(localforage.getItem as jest.Mock).mockResolvedValueOnce('1')

    const { result } = renderHook(() => useNotebookFiles())
    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      result.current.deleteNotebook('1')
    })

    expect(result.current.files.length).toBe(0)
    expect(result.current.activeFileId).toBeNull()
  })
})
