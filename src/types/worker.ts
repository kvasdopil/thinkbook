// Shared types for worker communication between main thread and Python worker

export interface WorkerMessage {
  type: 'init' | 'execute' | 'interrupt' | 'setInterruptBuffer';
  id: string;
  code?: string;
  buffer?: SharedArrayBuffer;
}

export interface WorkerResponse {
  type: 'ready' | 'output' | 'error' | 'complete' | 'out' | 'err' | 'cancelled';
  id: string;
  content?: string;
  error?: string;
  value?: string; // For streaming output messages
}

export interface ExecutionResult {
  output: string[];
  error: string | null;
  isComplete: boolean;
}
