import { useState, useEffect, useRef } from 'react';
import { FaChevronLeft, FaChevronRight, FaCog } from 'react-icons/fa';
import type { NotebookFile } from '../types/notebook';

interface NotebookHeaderProps {
  activeFile: NotebookFile | null;
  onTitleUpdate: (id: string, title: string) => void;
  onSettingsClick: () => void;
  isNotebookPanelCollapsed: boolean;
  toggleNotebookPanel: () => void;
}

export function NotebookHeader({
  activeFile,
  onTitleUpdate,
  onSettingsClick,
  isNotebookPanelCollapsed,
  toggleNotebookPanel,
}: NotebookHeaderProps) {
  const [titleValue, setTitleValue] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

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

      <button
        onClick={onSettingsClick}
        className="ml-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Open settings"
        title="Settings"
        tabIndex={0}
      >
        <FaCog className="w-5 h-5" />
      </button>
    </div>
  );
}
