import { useState, useEffect } from 'react';
import { FaCog, FaTrash } from 'react-icons/fa';

interface NotebookHeaderProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  onSettingsClick: () => void;
  onDeleteClick: () => void;
}

export const NotebookHeader = ({
  title,
  onTitleChange,
  onSettingsClick,
  onDeleteClick,
}: NotebookHeaderProps) => {
  const [currentTitle, setCurrentTitle] = useState(title);

  useEffect(() => {
    setCurrentTitle(title);
  }, [title]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTitle(e.target.value);
  };

  const handleTitleBlur = () => {
    if (currentTitle !== title) {
      onTitleChange(currentTitle);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Delete this notebook? This action cannot be undone.')) {
      onDeleteClick();
    }
  };

  return (
    <header className="flex items-center justify-between p-4">
      <input
        type="text"
        value={currentTitle}
        onChange={handleTitleChange}
        onBlur={handleTitleBlur}
        className="text-3xl font-bold leading-tight outline-none bg-transparent"
        aria-label="Notebook Title"
      />
      <div className="flex items-center space-x-4">
        <button
          onClick={onSettingsClick}
          aria-label="Settings"
          className="text-gray-500 hover:opacity-75"
        >
          <FaCog />
        </button>
        <button
          onClick={handleDelete}
          aria-label="Delete Notebook"
          tabIndex={0}
          className="text-gray-500 hover:opacity-75"
        >
          <FaTrash />
        </button>
      </div>
    </header>
  );
};
