import { useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { NotebookFile } from '../components/FilePanel'
import { ConversationItem } from '@/types/conversation'
import {
  saveNotebookFiles,
  loadNotebookFiles,
  saveLastActiveFileId,
  loadLastActiveFileId,
} from '../utils/storage'

export const useNotebookFiles = () => {
  const [files, setFiles] = useState<NotebookFile[]>([])
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadFiles = async () => {
      setIsLoading(true)
      const storedFiles = await loadNotebookFiles()
      const lastActiveId = await loadLastActiveFileId()

      if (storedFiles) {
        const filesArray = Object.values(storedFiles)
        setFiles(filesArray)
        if (lastActiveId && storedFiles[lastActiveId]) {
          setActiveFileId(lastActiveId)
        } else if (filesArray.length > 0) {
          setActiveFileId(filesArray[0].id)
        }
      }
      setIsLoading(false)
    }
    loadFiles()
  }, [])

  const saveFiles = useCallback(async (updatedFiles: NotebookFile[]) => {
    const filesMap = updatedFiles.reduce(
      (acc, file) => {
        acc[file.id] = file
        return acc
      },
      {} as Record<string, NotebookFile>
    )
    await saveNotebookFiles(filesMap)
    setFiles(updatedFiles)
  }, [])

  const createNewFile = useCallback(() => {
    const newFile: NotebookFile = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      title: 'Untitled',
      cells: [],
      messages: [],
    }
    const updatedFiles = [...files, newFile]
    saveFiles(updatedFiles)
    setActiveFileId(newFile.id)
    saveLastActiveFileId(newFile.id)
    return newFile
  }, [files, saveFiles])

  const updateActiveFile = useCallback(
    (updatedContent: Partial<Omit<NotebookFile, 'id' | 'createdAt'>>) => {
      if (!activeFileId) return

      const updatedFiles = files.map((file) => {
        if (file.id === activeFileId) {
          const updatedFile = {
            ...file,
            ...updatedContent,
            updatedAt: new Date().toISOString(),
          }
          // Update title if first cell's content changes
          if (
            updatedContent.cells &&
            updatedContent.cells.length > 0 &&
            updatedContent.cells[0].content
          ) {
            const firstCellContent = updatedContent.cells[0].content
            const newTitle =
              firstCellContent
                .split('\n')[0]
                .replace(/^#+\s*/, '')
                .trim() || 'Untitled'
            if (newTitle) {
              updatedFile.title = newTitle
            }
          }
          return updatedFile
        }
        return file
      })

      saveFiles(updatedFiles)
    },
    [activeFileId, files, saveFiles]
  )

  const selectFile = useCallback((id: string) => {
    setActiveFileId(id)
    saveLastActiveFileId(id)
  }, [])

  const getActiveFile = useCallback(() => {
    return files.find((f) => f.id === activeFileId) || null
  }, [files, activeFileId])

  return {
    files,
    activeFileId,
    isLoading,
    createNewFile,
    updateActiveFile,
    selectFile,
    getActiveFile,
  }
}
