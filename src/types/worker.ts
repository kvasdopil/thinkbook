// Shared types for worker communication between main thread and Python worker

export interface WorkerMessage {
  type: 'init' | 'execute' | 'interrupt';
  id: string;
  code?: string;
}

export interface WorkerResponse {
  type: 'ready' | 'output' | 'error' | 'complete' | 'out' | 'err';
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
