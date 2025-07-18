'use client'

import type { TablePayload } from '../types/worker'

interface TableDisplayProps {
  table: TablePayload
}

export default function TableDisplay({ table }: TableDisplayProps) {
  const { columns, data, totalRows } = table
  const displayedRows = data.length

  return (
    <div className="my-4">
      {totalRows > displayedRows && (
        <div className="mb-2 text-sm text-gray-600">
          Showing first {displayedRows} of {totalRows} rows
        </div>
      )}
      <div className="overflow-x-auto border border-gray-300 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
