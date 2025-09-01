import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { AiChatMessage } from '../types/ai-chat';

/**
 * A simplified store that manages chat messages per notebook file.
 * This eliminates the race condition by centralizing message management.
 */
interface NotebookChatState {
  // Map of fileId -> messages
  messagesByFile: Record<string, AiChatMessage[]>;
  
  // Currently active file
  activeFileId: string | null;
  
  // Loading states
  isLoadingMessages: boolean;
}

interface NotebookChatActions {
  // Switch to a different file (this is where the magic happens)
  switchToFile: (fileId: string | null, initialMessages?: AiChatMessage[]) => void;
  
  // Update messages for the currently active file
  updateMessages: (messages: AiChatMessage[]) => void;
  
  // Get messages for a specific file
  getMessagesForFile: (fileId: string) => AiChatMessage[];
  
  // Get messages for the currently active file
  getCurrentMessages: () => AiChatMessage[];
  
  // Internal state management
  setLoadingMessages: (loading: boolean) => void;
}

export const useNotebookChatStoreSimple = create<NotebookChatState & NotebookChatActions>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    messagesByFile: {},
    activeFileId: null,
    isLoadingMessages: false,

    // Actions
    switchToFile: (fileId: string | null, initialMessages: AiChatMessage[] = []) => {
      set({ 
        activeFileId: fileId,
        messagesByFile: fileId 
          ? { ...get().messagesByFile, [fileId]: initialMessages }
          : get().messagesByFile
      });
    },

    updateMessages: (messages: AiChatMessage[]) => {
      const { activeFileId } = get();
      if (!activeFileId) return;
      
      set(state => ({
        messagesByFile: {
          ...state.messagesByFile,
          [activeFileId]: messages
        }
      }));
    },

    getMessagesForFile: (fileId: string) => {
      return get().messagesByFile[fileId] || [];
    },

    getCurrentMessages: () => {
      const { activeFileId, messagesByFile } = get();
      return activeFileId ? messagesByFile[activeFileId] || [] : [];
    },

    setLoadingMessages: (loading: boolean) => {
      set({ isLoadingMessages: loading });
    },
  }))
);