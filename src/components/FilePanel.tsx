import React from 'react';
import { FaPlus } from 'react-icons/fa';
import { formatRelative } from 'date-fns';

export interface NotebookFile {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  cells: any[]; // Replace with actual Cell type
  messages: any[]; // Replace with actual MessagePart type
}

interface FilePanelProps {
  files: NotebookFile[];
  activeFileId: string | null;
  onNewFile: () => void;
  onFileSelect: (id: string) => void;
}

const FilePanel: React.FC<FilePanelProps> = ({ files, activeFileId, onNewFile, onFileSelect }) => {
  const groupedFiles = files.reduce((acc, file) => {
    const group = formatRelative(new Date(file.updatedAt), new Date());
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(file);
    return acc;
  }, {} as Record<string, NotebookFile[]>);

  return (
    <div className="w-64 bg-gray-100 p-4">
      <button
        onClick={onNewFile}
        className="flex items-center justify-center w-full p-2 mb-4 text-white bg-blue-500 rounded hover:bg-blue-600"
      >
        <FaPlus className="mr-2" />
        New File
      </button>
      <div className="space-y-4">
        {Object.entries(groupedFiles).map(([group, files]) => (
          <div key={group}>
            <h2 className="text-sm font-semibold text-gray-500">{group}</h2>
            <ul className="mt-2 space-y-1">
              {files.map(file => (
                <li
                  key={file.id}
                  onClick={() => onFileSelect(file.id)}
                  className={`p-2 rounded cursor-pointer ${
                    activeFileId === file.id ? 'bg-blue-200' : 'hover:bg-gray-200'
                  }`}
                >
                  <div className="font-semibold">{file.title}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(file.updatedAt).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FilePanel;
