import { useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { NotebookFile } from '../components/FilePanel'
import {
  saveNotebookFiles,
  loadNotebookFiles,
  saveLastActiveFileId,
  loadLastActiveFileId,
} from '../utils/storage'
import isEqual from 'lodash/isEqual'

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

      const currentFile = files.find((file) => file.id === activeFileId)
      if (!currentFile) return

      const updatedFile = {
        ...currentFile,
        ...updatedContent,
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

      const relevantFields = (
        file: Omit<NotebookFile, 'id' | 'createdAt' | 'updatedAt'>
      ) => ({
        title: file.title,
        messages: file.messages,
        cells: file.cells.map((cell) => ({
          text: cell.text,
          type: cell.type,
        })),
      })

      const hasChanged = !isEqual(
        relevantFields(currentFile),
        relevantFields(updatedFile)
      )

      if (!hasChanged) {
        return
      }

      updatedFile.updatedAt = new Date().toISOString()

      const updatedFiles = files.map((file) =>
        file.id === activeFileId ? updatedFile : file
      )

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

  const deleteNotebook = useCallback(
    async (id: string) => {
      const updatedFiles = files.filter((file) => file.id !== id)
      await saveFiles(updatedFiles)

      if (activeFileId === id) {
        if (updatedFiles.length > 0) {
          const sortedFiles = [...updatedFiles].sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )
          selectFile(sortedFiles[0].id)
        } else {
          setActiveFileId(null)
          saveLastActiveFileId(null)
        }
      }
    },
    [files, activeFileId, saveFiles, selectFile]
  )

  return {
    files,
    activeFileId,
    isLoading,
    createNewFile,
    updateActiveFile,
    selectFile,
    getActiveFile,
    deleteNotebook,
  }
}
