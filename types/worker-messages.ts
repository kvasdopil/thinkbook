// Shared types for worker communication

export interface WorkerOutputMessage {
  type: "out" | "err";
  value: string;
  id: string;
}

export interface WorkerStatusMessage {
  type: "execution-complete" | "error" | "init-complete";
  message?: string;
  id?: string;
}

export interface WorkerExecuteMessage {
  type: "execute";
  code: string;
  id: string;
}

export interface WorkerInitMessage {
  type: "init";
}

// Messages sent from main thread to worker
export type WorkerInputMessage = WorkerExecuteMessage | WorkerInitMessage;

// Messages sent from worker to main thread
export type WorkerResponseMessage = WorkerOutputMessage | WorkerStatusMessage;
