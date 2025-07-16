import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FilePanel, { NotebookFile } from '../components/FilePanel';
import '@testing-library/jest-dom';

const mockFiles: NotebookFile[] = [
  { id: '1', title: 'File 1', updatedAt: new Date().toISOString(), createdAt: new Date().toISOString(), cells: [], messages: [] },
  { id: '2', title: 'File 2', updatedAt: new Date(Date.now() - 86400000).toISOString(), createdAt: new Date().toISOString(), cells: [], messages: [] },
];

describe('FilePanel', () => {
  it('renders the new file button', () => {
    render(<FilePanel files={[]} activeFileId={null} onNewFile={() => {}} onFileSelect={() => {}} />);
    expect(screen.getByText('New File')).toBeInTheDocument();
  });

  it('calls onNewFile when the new file button is clicked', () => {
    const onNewFile = jest.fn();
    render(<FilePanel files={[]} activeFileId={null} onNewFile={onNewFile} onFileSelect={() => {}} />);
    fireEvent.click(screen.getByText('New File'));
    expect(onNewFile).toHaveBeenCalled();
  });

  it('renders a list of files', () => {
    render(<FilePanel files={mockFiles} activeFileId={null} onNewFile={() => {}} onFileSelect={() => {}} />);
    expect(screen.getByText('File 1')).toBeInTheDocument();
    expect(screen.getByText('File 2')).toBeInTheDocument();
  });

  it('highlights the active file', () => {
    render(<FilePanel files={mockFiles} activeFileId="1" onNewFile={() => {}} onFileSelect={() => {}} />);
    const file1 = screen.getByText('File 1').closest('li');
    expect(file1).toHaveClass('bg-blue-200');
  });

  it('calls onFileSelect when a file is clicked', () => {
    const onFileSelect = jest.fn();
    render(<FilePanel files={mockFiles} activeFileId={null} onNewFile={() => {}} onFileSelect={onFileSelect} />);
    fireEvent.click(screen.getByText('File 1'));
    expect(onFileSelect).toHaveBeenCalledWith('1');
  });
});
