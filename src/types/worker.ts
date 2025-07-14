// Message types for worker communication

export interface PyodideMessage {
  type: 'init' | 'execute'
  code?: string
}

export interface PyodideResponse {
  type: 'init-complete' | 'result' | 'error' | 'output'
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
