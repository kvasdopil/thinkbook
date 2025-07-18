import { render, screen } from '@testing-library/react'
import TableDisplay from '../TableDisplay'
import '@testing-library/jest-dom'

describe('TableDisplay', () => {
  const tableData = {
    columns: ['Name', 'Age'],
    data: [
      ['Alice', 30],
      ['Bob', 25],
    ],
    totalRows: 2,
  }

  it('renders the table with the correct headers and data', () => {
    render(<TableDisplay table={tableData} />)

    // Check for headers
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Age')).toBeInTheDocument()

    // Check for data
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()
  })

  it('does not show the "showing first" message when total rows are not greater than displayed rows', () => {
    render(<TableDisplay table={tableData} />)
    expect(
      screen.queryByText(/Showing first \d+ of \d+ rows/)
    ).not.toBeInTheDocument()
  })

  it('shows the "showing first" message when total rows are greater than displayed rows', () => {
    const partialTableData = {
      ...tableData,
      totalRows: 5,
    }
    render(<TableDisplay table={partialTableData} />)
    expect(
      screen.getByText('Showing first 2 of 5 rows')
    ).toBeInTheDocument()
  })
})
