// Message types for worker communication

export interface PyodideMessage {
  type: 'init' | 'execute' | 'setInterruptBuffer' | 'cancel'
  id?: string // Add optional id for execute messages
  code?: string
  buffer?: SharedArrayBuffer
}

export interface TablePayload {
  columns: string[]
  data: (string | number | null)[][]
  totalRows: number
}

export interface PyodideResponse {
  type:
    | 'init-complete'
    | 'result'
    | 'error'
    | 'output'
    | 'table' // New type for table data
    | 'execution-complete'
    | 'execution-error'
    | 'execution-cancelled'
    | 'interrupt-buffer-set'
    | 'shared-array-buffer-unavailable'
  id?: string // Add id to all responses to identify the cell
  result?: string
  error?: string
  output?: {
    type: 'out' | 'err'
    value: string
  }
  table?: TablePayload // Add table payload
}

export interface StreamingOutput {
  type: 'out' | 'err'
  value: string
}
