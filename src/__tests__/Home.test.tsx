import { render, screen } from '@testing-library/react'
import Home from '@/app/page'

// Mock Monaco Editor
jest.mock('@monaco-editor/react', () => ({
  Editor: ({
    value,
    onChange,
  }: {
    value: string
    onChange?: (value: string) => void
  }) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}))

describe('Home', () => {
  it('renders the main heading', () => {
    render(<Home />)

    const heading = screen.getByRole('heading', {
      name: /jupyter engine - python in browser/i,
    })

    expect(heading).toBeInTheDocument()
  })

  it('renders the code editor component', () => {
    render(<Home />)

    // Check for editor elements
    expect(screen.getByText('Python Editor')).toBeInTheDocument()
    expect(screen.getByText('Output')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /run/i })).toBeInTheDocument()
  })
})
