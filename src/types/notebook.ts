import type { CellData } from '../ai-functions';
import type { AiChatMessage } from './ai-chat';

export interface NotebookFile {
  id: string; // uuid
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
  title: string; // first cell title or "Untitled"
  cells: CellData[]; // id, type, content
  messages: AiChatMessage[]; // AI + user + tool parts
}

export interface NotebookFilesStore {
  files: Record<string, NotebookFile>;
  lastActiveFileId: string | null;
}
