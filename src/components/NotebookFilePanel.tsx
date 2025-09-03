import { useState } from 'react';
import { FaPlus, FaFile, FaTrash } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';
import { useNotebookFiles } from '../hooks/useNotebookFiles';
import { useUiStore } from '../store/uiStore';
import type { NotebookFile } from '../types/notebook';

interface NotebookFilePanelProps {
  onFileSelect?: (file: NotebookFile) => void;
  onNewFile?: (file: NotebookFile) => void;
}

interface FileItemProps {
  file: NotebookFile;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}

const FileItem = ({ file, isActive, onClick, onDelete }: FileItemProps) => {
  const [showDeleteButton, setShowDeleteButton] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete "${file.title}"?`)) {
      onDelete();
    }
  };

  const timeAgo = formatDistanceToNow(new Date(file.updatedAt), {
    addSuffix: true,
  });

  return (
    <div
      className={`
        group relative p-3 rounded-md cursor-pointer transition-all
        hover:bg-gray-50
        ${isActive ? 'bg-blue-50 border-blue-200 border' : 'bg-white'}
      `}
      onClick={onClick}
      onMouseEnter={() => setShowDeleteButton(true)}
      onMouseLeave={() => setShowDeleteButton(false)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FaFile
            className={`
              flex-shrink-0 w-4 h-4 mt-0.5
              ${isActive ? 'text-blue-600' : 'text-gray-400'}
            `}
          />
          <div className="min-w-0 flex-1">
            <div
              className={`
                font-medium text-sm truncate
                ${isActive ? 'text-blue-900' : 'text-gray-900'}
              `}
            >
              {file.title}
            </div>
            <div className="text-xs text-gray-500 mt-1">{timeAgo}</div>
          </div>
        </div>
        {showDeleteButton && (
          <button
            onClick={handleDeleteClick}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
            title="Delete file"
          >
            <FaTrash className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};

interface FileGroupProps {
  title: string;
  files: NotebookFile[];
  activeFileId: string | null;
  onFileClick: (file: NotebookFile) => void;
  onFileDelete: (fileId: string) => void;
}

const FileGroup = ({
  title,
  files,
  activeFileId,
  onFileClick,
  onFileDelete,
}: FileGroupProps) => {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-2 px-1">{title}</h3>
      <div className="space-y-1">
        {files.map((file) => (
          <FileItem
            key={file.id}
            file={file}
            isActive={file.id === activeFileId}
            onClick={() => onFileClick(file)}
            onDelete={() => onFileDelete(file.id)}
          />
        ))}
      </div>
    </div>
  );
};

export const NotebookFilePanel = ({
  onFileSelect,
  onNewFile,
}: NotebookFilePanelProps) => {
  const {
    groupedFiles,
    activeFileId,
    isLoading,
    createFile,
    deleteFile,
    setActiveFile,
  } = useNotebookFiles();
  const { isNotebookPanelCollapsed } = useUiStore();

  const handleNewFile = () => {
    const newFile = createFile();
    onNewFile?.(newFile);
  };

  const handleFileClick = (file: NotebookFile) => {
    setActiveFile(file.id);
    onFileSelect?.(file);
  };

  const handleFileDelete = (fileId: string) => {
    deleteFile(fileId);
  };

  if (isLoading) {
    return (
      <div
        className={`${isNotebookPanelCollapsed ? 'w-0' : 'w-80'} bg-white border-r border-gray-200 p-4 transition-all duration-300 overflow-hidden`}
      >
        <div className="animate-pulse" data-testid="loading-skeleton">
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const hasFiles = Object.keys(groupedFiles).length > 0;

  return (
    <div
      className={`${isNotebookPanelCollapsed ? 'w-0' : 'w-80'} bg-white border-r border-gray-200 flex flex-col h-full transition-all duration-300 overflow-hidden`}
    >
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4">
          <button
            onClick={handleNewFile}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            title="Create new notebook"
          >
            <FaPlus className="w-3 h-3" />
            New File
          </button>
        </div>
        {hasFiles ? (
          <div>
            {Object.entries(groupedFiles).map(([groupTitle, files]) => (
              <FileGroup
                key={groupTitle}
                title={groupTitle}
                files={files}
                activeFileId={activeFileId}
                onFileClick={handleFileClick}
                onFileDelete={handleFileDelete}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FaFile className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm mb-4">No notebooks yet</p>
            <button
              onClick={handleNewFile}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium cursor-pointer"
            >
              Create your first notebook
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
