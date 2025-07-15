import { render, screen } from '@testing-library/react'
import Home from '../app/page'

// Mock the Chat component
jest.mock('../components/Chat', () => {
  return function MockChat() {
    return <div>Mock Chat Component</div>
  }
})

// Mock the Cell component
jest.mock('../components/Cell', () => {
  return function MockCell() {
    return <div>Mock Cell Component</div>
  }
})

// Mock the worker
jest.mock('../workers/pyodide.worker.ts', () => {
  return jest.fn()
})

describe('Home', () => {
  it('renders the main title', () => {
    render(<Home />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Jupyter Engine - Python in Browser'
    )
  })

  it('renders the control buttons', () => {
    render(<Home />)
    expect(screen.getByRole('button', { name: /run all/i })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /add new cell/i })
    ).toBeInTheDocument()
  })

  it('renders the chat and cell components', () => {
    render(<Home />)
    expect(screen.getByText('Mock Chat Component')).toBeInTheDocument()
    expect(screen.getByText('Mock Cell Component')).toBeInTheDocument()
  })
})
