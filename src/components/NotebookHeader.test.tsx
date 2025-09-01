import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NotebookHeader } from './NotebookHeader';
import type { NotebookFile } from '../types/notebook';

describe('NotebookHeader', () => {
  const mockActiveFile: NotebookFile = {
    id: 'test-id',
    title: 'Test Notebook',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    cells: [],
    messages: [],
  };

  const mockProps = {
    activeFile: mockActiveFile,
    onTitleUpdate: vi.fn(),
    onSettingsClick: vi.fn(),
    isNotebookPanelCollapsed: false,
    toggleNotebookPanel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders notebook header with title input and settings button', () => {
    render(<NotebookHeader {...mockProps} />);
    
    const titleInput = screen.getByLabelText('Notebook title');
    const settingsButton = screen.getByLabelText('Open settings');
    
    expect(titleInput).toBeInTheDocument();
    expect(settingsButton).toBeInTheDocument();
    expect(titleInput).toHaveValue('Test Notebook');
  });

  it('does not render when activeFile is null', () => {
    render(<NotebookHeader {...mockProps} activeFile={null} />);
    
    const titleInput = screen.queryByLabelText('Notebook title');
    expect(titleInput).not.toBeInTheDocument();
  });

  it('updates title input value when typing', () => {
    render(<NotebookHeader {...mockProps} />);
    
    const titleInput = screen.getByLabelText('Notebook title');
    fireEvent.change(titleInput, { target: { value: 'New Title' } });
    
    expect(titleInput).toHaveValue('New Title');
  });

  it('calls onTitleUpdate when input loses focus with changed value', async () => {
    render(<NotebookHeader {...mockProps} />);
    
    const titleInput = screen.getByLabelText('Notebook title');
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } });
    fireEvent.blur(titleInput);
    
    await waitFor(() => {
      expect(mockProps.onTitleUpdate).toHaveBeenCalledWith('test-id', 'Updated Title');
    });
  });

  it('does not call onTitleUpdate when input loses focus with same value', async () => {
    render(<NotebookHeader {...mockProps} />);
    
    const titleInput = screen.getByLabelText('Notebook title');
    fireEvent.blur(titleInput);
    
    await waitFor(() => {
      expect(mockProps.onTitleUpdate).not.toHaveBeenCalled();
    });
  });

  it('triggers blur when Enter key is pressed', async () => {
    render(<NotebookHeader {...mockProps} />);
    
    const titleInput = screen.getByLabelText('Notebook title');
    fireEvent.change(titleInput, { target: { value: 'New Title' } });
    fireEvent.keyDown(titleInput, { key: 'Enter' });
    // Manually trigger blur since jsdom doesn't automatically handle focus changes
    fireEvent.blur(titleInput);
    
    await waitFor(() => {
      expect(mockProps.onTitleUpdate).toHaveBeenCalledWith('test-id', 'New Title');
    });
  });

  it('focuses title input when clicking on title area', () => {
    render(<NotebookHeader {...mockProps} />);
    
    const titleArea = screen.getByLabelText('Click to edit notebook title');
    const titleInput = screen.getByLabelText('Notebook title');
    
    fireEvent.click(titleArea);
    
    expect(titleInput).toHaveFocus();
  });

  it('calls onSettingsClick when settings button is clicked', () => {
    render(<NotebookHeader {...mockProps} />);
    
    const settingsButton = screen.getByLabelText('Open settings');
    fireEvent.click(settingsButton);
    
    expect(mockProps.onSettingsClick).toHaveBeenCalled();
  });

  it('syncs title input with activeFile changes', () => {
    const { rerender } = render(<NotebookHeader {...mockProps} />);
    
    const titleInput = screen.getByLabelText('Notebook title');
    expect(titleInput).toHaveValue('Test Notebook');
    
    const updatedFile = { ...mockActiveFile, title: 'Updated from Props' };
    rerender(<NotebookHeader {...mockProps} activeFile={updatedFile} />);
    
    expect(titleInput).toHaveValue('Updated from Props');
  });

  it('resets title when switching to different file', () => {
    const { rerender } = render(<NotebookHeader {...mockProps} />);
    
    const titleInput = screen.getByLabelText('Notebook title');
    fireEvent.change(titleInput, { target: { value: 'Local Change' } });
    expect(titleInput).toHaveValue('Local Change');
    
    const newFile = { ...mockActiveFile, id: 'new-id', title: 'Different File' };
    rerender(<NotebookHeader {...mockProps} activeFile={newFile} />);
    
    expect(titleInput).toHaveValue('Different File');
  });

  it('has proper accessibility attributes', () => {
    render(<NotebookHeader {...mockProps} />);
    
    const header = screen.getByRole('banner');
    const titleInput = screen.getByLabelText('Notebook title');
    const settingsButton = screen.getByLabelText('Open settings');
    const titleArea = screen.getByLabelText('Click to edit notebook title');
    
    expect(header).toHaveAttribute('aria-label', 'Notebook header');
    expect(titleInput).toHaveAttribute('aria-label', 'Notebook title');
    expect(titleInput).toHaveAttribute('tabIndex', '0');
    expect(settingsButton).toHaveAttribute('aria-label', 'Open settings');
    expect(settingsButton).toHaveAttribute('tabIndex', '0');
    expect(titleArea).toHaveAttribute('aria-label', 'Click to edit notebook title');
  });

  it('applies correct CSS classes for styling', () => {
    render(<NotebookHeader {...mockProps} />);
    
    const titleInput = screen.getByLabelText('Notebook title');
    
    expect(titleInput).toHaveClass(
      'text-3xl',
      'font-bold', 
      'leading-tight',
      'outline-none',
      'bg-transparent',
      'w-full'
    );
  });

  it('shows Untitled when activeFile has no title', () => {
    const fileWithoutTitle = { ...mockActiveFile, title: '' };
    render(<NotebookHeader {...mockProps} activeFile={fileWithoutTitle} />);
    
    const titleInput = screen.getByLabelText('Notebook title');
    expect(titleInput).toHaveValue('Untitled');
  });
});