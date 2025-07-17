import { useState, useEffect } from 'react';
import { FaCog } from 'react-icons/fa';

interface NotebookHeaderProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  onSettingsClick: () => void;
}

export const NotebookHeader = ({
  title,
  onTitleChange,
  onSettingsClick,
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
      <button onClick={onSettingsClick} aria-label="Settings">
        <FaCog />
      </button>
    </header>
  );
};
