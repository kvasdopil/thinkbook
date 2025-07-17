import { render, screen, fireEvent } from '@testing-library/react'
import { NotebookHeader } from '@/components/NotebookHeader'

describe('NotebookHeader', () => {
  const defaultProps = {
    title: 'Test Title',
    onTitleChange: jest.fn(),
    onSettingsClick: jest.fn(),
    onDeleteClick: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    window.confirm = jest.fn(() => true) // Auto-confirm deletions
  })

  it('renders the title, settings icon, and delete icon', () => {
    render(<NotebookHeader {...defaultProps} />)

    expect(screen.getByDisplayValue('Test Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Settings')).toBeInTheDocument()
    expect(screen.getByLabelText('Delete Notebook')).toBeInTheDocument()
  })

  it('calls onTitleChange when the title is edited and blurred', () => {
    render(<NotebookHeader {...defaultProps} />)

    const titleInput = screen.getByDisplayValue('Test Title')
    fireEvent.change(titleInput, { target: { value: 'New Title' } })
    fireEvent.blur(titleInput)

    expect(defaultProps.onTitleChange).toHaveBeenCalledWith('New Title')
  })

  it('does not call onTitleChange if the title is unchanged', () => {
    render(<NotebookHeader {...defaultProps} />)
    const titleInput = screen.getByDisplayValue('Test Title')
    fireEvent.blur(titleInput)
    expect(defaultProps.onTitleChange).not.toHaveBeenCalled()
  })

  it('calls onSettingsClick when the settings icon is clicked', () => {
    render(<NotebookHeader {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('Settings'))
    expect(defaultProps.onSettingsClick).toHaveBeenCalled()
  })

  it('calls onDeleteClick when delete is confirmed', () => {
    render(<NotebookHeader {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('Delete Notebook'))
    expect(window.confirm).toHaveBeenCalledWith(
      'Delete this notebook? This action cannot be undone.'
    )
    expect(defaultProps.onDeleteClick).toHaveBeenCalled()
  })

  it('does not call onDeleteClick when delete is cancelled', () => {
    ;(window.confirm as jest.Mock).mockReturnValue(false)
    render(<NotebookHeader {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('Delete Notebook'))
    expect(window.confirm).toHaveBeenCalled()
    expect(defaultProps.onDeleteClick).not.toHaveBeenCalled()
  })
})
