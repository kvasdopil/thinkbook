'use client'

import Home from '@/components/Home'
import FilePanel from '@/components/FilePanel'
import { useNotebookFiles } from '@/hooks/useNotebookFiles'

export default function Page() {
  const {
    files,
    activeFileId,
    isLoading,
    createNewFile,
    selectFile,
    getActiveFile,
    updateActiveFile,
    deleteNotebook,
  } = useNotebookFiles()

  if (isLoading) {
    return <div>Loading...</div>
  }

  const activeFile = getActiveFile()

  return (
    <div className="flex h-screen">
      <FilePanel
        files={files}
        activeFileId={activeFileId}
        onNewFile={createNewFile}
        onFileSelect={selectFile}
      />
      <div className="flex-1">
        {activeFile ? (
          <Home
            key={activeFile.id}
            activeFile={activeFile}
            onUpdate={updateActiveFile}
            onDelete={deleteNotebook}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <button
              onClick={createNewFile}
              className="p-4 text-white bg-blue-500 rounded"
            >
              Create a new file
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
