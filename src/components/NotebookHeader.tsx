import { useState, useEffect, useRef } from 'react';
import {
  FaChevronLeft,
  FaChevronRight,
  FaCog,
  FaPlay,
  FaPlus,
} from 'react-icons/fa';
import type { NotebookFile } from '../types/notebook';
import { useNotebookCodeStore } from '../store/notebookCodeStore';

interface NotebookHeaderProps {
  activeFile: NotebookFile | null;
  onTitleUpdate: (id: string, title: string) => void;
  onSettingsClick: () => void;
  isNotebookPanelCollapsed: boolean;
  toggleNotebookPanel: () => void;
  onRunAll?: () => void;
  onAddCell?: () => void;
  lastMessageId?: string; // ID of the last message in the conversation
}

export function NotebookHeader({
  activeFile,
  onTitleUpdate,
  onSettingsClick,
  isNotebookPanelCollapsed,
  toggleNotebookPanel,
  onRunAll,
  onAddCell,
  lastMessageId,
}: NotebookHeaderProps) {
  const [titleValue, setTitleValue] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const { getCodeCells, addCell } = useNotebookCodeStore();

  // Sync local state with active file title
  useEffect(() => {
    setTitleValue(activeFile?.title || 'Untitled');
  }, [activeFile?.title, activeFile?.id]);

  const handleTitleChange = (newTitle: string) => {
    setTitleValue(newTitle);
  };

  const handleTitleBlur = () => {
    if (activeFile && titleValue !== activeFile.title) {
      onTitleUpdate(activeFile.id, titleValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const handleTitleClick = () => {
    titleInputRef.current?.focus();
  };

  const handleAddCell = () => {
    if (activeFile) {
      // For manual cell creation, bind to the last message in the conversation
      const creationContext = lastMessageId
        ? { messageId: lastMessageId }
        : undefined;
      addCell(activeFile.id, undefined, creationContext);
    }
    onAddCell?.();
  };

  const handleRunAll = () => {
    onRunAll?.();
  };

  // Get cells for the current notebook to determine button states
  const cells = activeFile ? getCodeCells(activeFile.id) : [];
  const hasCells = cells.length > 0;

  if (!activeFile) {
    return null;
  }

  return (
    <div
      className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white"
      role="banner"
      aria-label="Notebook header"
    >
      <button
        onClick={toggleNotebookPanel}
        className="p-2 mr-4 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label={
          isNotebookPanelCollapsed
            ? 'Show notebook panel'
            : 'Hide notebook panel'
        }
        title={
          isNotebookPanelCollapsed
            ? 'Show notebook panel'
            : 'Hide notebook panel'
        }
      >
        {isNotebookPanelCollapsed ? (
          <FaChevronRight className="w-4 h-4" />
        ) : (
          <FaChevronLeft className="w-4 h-4" />
        )}
      </button>
      <div
        className="flex-1 cursor-text"
        onClick={handleTitleClick}
        role="button"
        tabIndex={-1}
        aria-label="Click to edit notebook title"
      >
        <input
          ref={titleInputRef}
          type="text"
          value={titleValue}
          onChange={(e) => handleTitleChange(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={handleKeyDown}
          className="text-3xl font-bold leading-tight outline-none bg-transparent w-full"
          aria-label="Notebook title"
          tabIndex={0}
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center space-x-2 ml-4">
        {/* Run All Button */}
        <button
          onClick={handleRunAll}
          disabled={!hasCells}
          className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Run all cells sequentially"
          data-testid="header-run-all-button"
        >
          <FaPlay className="w-3 h-3" />
          <span>Run All</span>
        </button>

        {/* Add Cell Button */}
        <button
          onClick={handleAddCell}
          className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500"
          title="Add new cell"
          data-testid="header-add-cell-button"
        >
          <FaPlus className="w-3 h-3" />
          <span>Add Cell</span>
        </button>

        {/* Settings Button */}
        <button
          onClick={onSettingsClick}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Open settings"
          title="Settings"
          tabIndex={0}
        >
          <FaCog className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
