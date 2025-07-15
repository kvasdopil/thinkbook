// Message types for worker communication

export interface PyodideMessage {
  type: 'init' | 'execute' | 'setInterruptBuffer' | 'cancel'
  code?: string
  buffer?: SharedArrayBuffer
}

export interface PyodideResponse {
  type:
    | 'init-complete'
    | 'result'
    | 'error'
    | 'output'
    | 'execution-complete'
    | 'execution-error'
    | 'execution-cancelled'
    | 'interrupt-buffer-set'
    | 'shared-array-buffer-unavailable'
  result?: string
  error?: string
  output?: {
    type: 'out' | 'err'
    value: string
  }
}

export interface StreamingOutput {
  type: 'out' | 'err'
  value: string
}
