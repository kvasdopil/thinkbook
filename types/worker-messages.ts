// Shared types for worker communication

export interface WorkerOutputMessage {
  type: "out" | "err";
  value: string;
  id: string;
}

export interface WorkerStatusMessage {
  type:
    | "execution-complete"
    | "error"
    | "init-complete"
    | "execution-cancelled";
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

export interface WorkerSetInterruptBufferMessage {
  type: "setInterruptBuffer";
  interruptBuffer: Uint8Array;
}

// Messages sent from main thread to worker
export type WorkerInputMessage =
  | WorkerExecuteMessage
  | WorkerInitMessage
  | WorkerSetInterruptBufferMessage;

// Messages sent from worker to main thread
export type WorkerResponseMessage = WorkerOutputMessage | WorkerStatusMessage;

// Chat message type for AI chat functionality
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
