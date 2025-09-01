import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotebookFilePanel } from './NotebookFilePanel';
import { useNotebookFiles } from '../hooks/useNotebookFiles';
import type { NotebookFile } from '../types/notebook';

// Mock the useNotebookFiles hook
vi.mock('../hooks/useNotebookFiles');

// Mock react-icons
vi.mock('react-icons/fa', () => ({
  FaPlus: () => <div data-testid="plus-icon">+</div>,
  FaFile: () => <div data-testid="file-icon">📄</div>,
  FaTrash: () => <div data-testid="trash-icon">🗑️</div>,
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '2 hours ago'),
}));

const mockFiles: Record<string, NotebookFile> = {
  'notebook-1': {
    id: 'notebook-1',
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
    title: 'Test Notebook 1',
    cells: [],
    messages: [],
  },
  'notebook-2': {
    id: 'notebook-2',
    createdAt: '2023-01-02T00:00:00.000Z',
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    title: 'Test Notebook 2',
    cells: [],
    messages: [],
  },
};

const mockGroupedFiles = {
  Today: [mockFiles['notebook-1']],
  Yesterday: [mockFiles['notebook-2']],
};

const mockUseNotebookFiles = {
  files: mockFiles,
  groupedFiles: mockGroupedFiles,
  activeFileId: 'notebook-1' as string | null,
  activeFile: mockFiles['notebook-1'] as NotebookFile | null,
  isLoading: false,
  createFile: vi.fn(),
  updateFile: vi.fn(),
  deleteFile: vi.fn(),
  setActiveFile: vi.fn(),
};

describe('NotebookFilePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNotebookFiles).mockReturnValue(mockUseNotebookFiles);
  });

  it('renders the panel with title and new file button', () => {
    render(<NotebookFilePanel />);

    expect(screen.getByText('Notebooks')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /new file/i }),
    ).toBeInTheDocument();
  });

  it('shows loading state when files are loading', () => {
    vi.mocked(useNotebookFiles).mockReturnValue({
      ...mockUseNotebookFiles,
      isLoading: true,
    });

    render(<NotebookFilePanel />);

    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('displays grouped files correctly', () => {
    render(<NotebookFilePanel />);

    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Yesterday')).toBeInTheDocument();
    expect(screen.getByText('Test Notebook 1')).toBeInTheDocument();
    expect(screen.getByText('Test Notebook 2')).toBeInTheDocument();
  });

  it('highlights the active file', () => {
    render(<NotebookFilePanel />);

    const activeFile = screen.getByText('Test Notebook 1').closest('div');
    const inactiveFile = screen.getByText('Test Notebook 2').closest('div');

    expect(activeFile).toHaveClass('bg-blue-50', 'border-blue-200');
    expect(inactiveFile).toHaveClass('bg-white', 'border-gray-200');
  });

  it('creates a new file when new file button is clicked', () => {
    const onNewFile = vi.fn();
    const mockCreateFile = vi.fn().mockReturnValue(mockFiles['notebook-1']);

    vi.mocked(useNotebookFiles).mockReturnValue({
      ...mockUseNotebookFiles,
      createFile: mockCreateFile,
    });

    render(<NotebookFilePanel onNewFile={onNewFile} />);

    fireEvent.click(screen.getByRole('button', { name: /new file/i }));

    expect(mockCreateFile).toHaveBeenCalled();
    expect(onNewFile).toHaveBeenCalledWith(mockFiles['notebook-1']);
  });

  it('selects a file when clicked', () => {
    const onFileSelect = vi.fn();

    render(<NotebookFilePanel onFileSelect={onFileSelect} />);

    fireEvent.click(screen.getByText('Test Notebook 2'));

    expect(mockUseNotebookFiles.setActiveFile).toHaveBeenCalledWith(
      'notebook-2',
    );
    expect(onFileSelect).toHaveBeenCalledWith(mockFiles['notebook-2']);
  });

  it('shows delete button on hover and deletes file when clicked', async () => {
    // Mock window.confirm
    const confirmSpy = vi.fn(() => true);
    Object.defineProperty(window, 'confirm', { value: confirmSpy });

    render(<NotebookFilePanel />);

    const fileItem =
      screen
        .getByText('Test Notebook 1')
        .closest('[data-testid="file-item"]') ||
      screen.getByText('Test Notebook 1').closest('div')!;

    fireEvent.mouseEnter(fileItem);

    await waitFor(() => {
      expect(screen.getByTestId('trash-icon')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('trash-icon'));

    expect(confirmSpy).toHaveBeenCalledWith('Delete "Test Notebook 1"?');
    expect(mockUseNotebookFiles.deleteFile).toHaveBeenCalledWith('notebook-1');
  });

  it('does not delete file if user cancels confirmation', async () => {
    const confirmSpy = vi.fn(() => false);
    Object.defineProperty(window, 'confirm', { value: confirmSpy });

    render(<NotebookFilePanel />);

    const fileItem = screen.getByText('Test Notebook 1').closest('div')!;
    fireEvent.mouseEnter(fileItem);

    await waitFor(() => {
      expect(screen.getByTestId('trash-icon')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('trash-icon'));

    expect(confirmSpy).toHaveBeenCalled();
    expect(mockUseNotebookFiles.deleteFile).not.toHaveBeenCalled();
  });

  it('shows empty state when no files exist', () => {
    vi.mocked(useNotebookFiles).mockReturnValue({
      ...mockUseNotebookFiles,
      groupedFiles: {},
    });

    render(<NotebookFilePanel />);

    expect(screen.getByText('No notebooks yet')).toBeInTheDocument();
    expect(screen.getByText('Create your first notebook')).toBeInTheDocument();
  });

  it('creates file when clicking empty state button', () => {
    const onNewFile = vi.fn();
    const mockCreateFile = vi.fn().mockReturnValue(mockFiles['notebook-1']);

    vi.mocked(useNotebookFiles).mockReturnValue({
      ...mockUseNotebookFiles,
      groupedFiles: {},
      createFile: mockCreateFile,
    });

    render(<NotebookFilePanel onNewFile={onNewFile} />);

    fireEvent.click(screen.getByText('Create your first notebook'));

    expect(mockCreateFile).toHaveBeenCalled();
    expect(onNewFile).toHaveBeenCalledWith(mockFiles['notebook-1']);
  });

  it('displays file timestamps correctly', () => {
    render(<NotebookFilePanel />);

    expect(screen.getAllByText('2 hours ago')).toHaveLength(2);
  });
});
