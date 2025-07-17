import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import FilePanel, { NotebookFile } from '../components/FilePanel'
import '@testing-library/jest-dom'

const mockFiles: NotebookFile[] = [
  {
    id: '1',
    title: 'File 1',
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    cells: [],
    messages: [],
  },
  {
    id: '2',
    title: 'File 2',
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    createdAt: new Date().toISOString(),
    cells: [],
    messages: [],
  },
]

describe('FilePanel', () => {
  it('renders the new file button', () => {
    render(
      <FilePanel
        files={[]}
        activeFileId={null}
        onNewFile={() => {}}
        onFileSelect={() => {}}
      />
    )
    expect(screen.getByText('New File')).toBeInTheDocument()
  })

  it('calls onNewFile when the new file button is clicked', () => {
    const onNewFile = jest.fn()
    render(
      <FilePanel
        files={[]}
        activeFileId={null}
        onNewFile={onNewFile}
        onFileSelect={() => {}}
      />
    )
    fireEvent.click(screen.getByText('New File'))
    expect(onNewFile).toHaveBeenCalled()
  })

  it('renders a list of files', () => {
    render(
      <FilePanel
        files={mockFiles}
        activeFileId={null}
        onNewFile={() => {}}
        onFileSelect={() => {}}
      />
    )
    expect(screen.getByText('File 1')).toBeInTheDocument()
    expect(screen.getByText('File 2')).toBeInTheDocument()
  })

  it('highlights the active file', () => {
    render(
      <FilePanel
        files={mockFiles}
        activeFileId="1"
        onNewFile={() => {}}
        onFileSelect={() => {}}
      />
    )
    const file1 = screen.getByText('File 1').closest('li')
    expect(file1).toHaveClass('bg-blue-200')
  })

  it('calls onFileSelect when a file is clicked', () => {
    const onFileSelect = jest.fn()
    render(
      <FilePanel
        files={mockFiles}
        activeFileId={null}
        onNewFile={() => {}}
        onFileSelect={onFileSelect}
      />
    )
    fireEvent.click(screen.getByText('File 1'))
    expect(onFileSelect).toHaveBeenCalledWith('1')
  })

  it('groups files by date, ignoring time', () => {
    const baseDate = new Date('2024-01-15T12:00:00.000Z')

    const today1 = new Date(baseDate)
    today1.setHours(9, 0, 0)

    const today2 = new Date(baseDate)
    today2.setHours(10, 0, 0)

    const yesterday = new Date(baseDate)
    yesterday.setDate(baseDate.getDate() - 1)

    const mockFilesWithDates: NotebookFile[] = [
      {
        id: '1',
        title: 'File 1 Today',
        updatedAt: today1.toISOString(),
        createdAt: baseDate.toISOString(),
        cells: [],
        messages: [],
      },
      {
        id: '2',
        title: 'File 2 Today',
        updatedAt: today2.toISOString(),
        createdAt: baseDate.toISOString(),
        cells: [],
        messages: [],
      },
      {
        id: '3',
        title: 'File 3 Yesterday',
        updatedAt: yesterday.toISOString(),
        createdAt: baseDate.toISOString(),
        cells: [],
        messages: [],
      },
    ]

    jest.useFakeTimers().setSystemTime(baseDate)

    render(
      <FilePanel
        files={mockFilesWithDates}
        activeFileId={null}
        onNewFile={() => {}}
        onFileSelect={() => {}}
      />
    )

    const headings = screen.getAllByRole('heading', { level: 2 })
    const headingTexts = headings.map((h) => h.textContent)

    const todayHeadings = headingTexts.filter((t) => t?.startsWith('Today'))
    expect(todayHeadings).toHaveLength(1)

    const yesterdayHeadings = headingTexts.filter((t) =>
      t?.startsWith('Yesterday')
    )
    expect(yesterdayHeadings).toHaveLength(1)

    const todayGroup = screen.getByText('Today').closest('div')
    expect(
      within(todayGroup as HTMLElement).getByText('File 1 Today')
    ).toBeInTheDocument()
    expect(
      within(todayGroup as HTMLElement).getByText('File 2 Today')
    ).toBeInTheDocument()

    const yesterdayGroup = screen.getByText('Yesterday').closest('div')
    expect(
      within(yesterdayGroup as HTMLElement).getByText('File 3 Yesterday')
    ).toBeInTheDocument()

    jest.useRealTimers()
  })
})
