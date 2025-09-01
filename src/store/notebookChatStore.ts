import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { NotebookFile } from '../types/notebook';
import type { AiChatMessage } from '../types/ai-chat';
import { storage } from '../utils/storage';

// Debounced storage helper
const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number,
): T => {
  let timeoutId: number;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
};

interface NotebookChatState {
  // Notebook files
  files: Record<string, NotebookFile>;
  activeFileId: string | null;
  isLoadingFiles: boolean;
  
  // Chat messages for the active file
  messages: AiChatMessage[];
  isLoadingMessages: boolean;
  
  // Chat state
  isSendingMessage: boolean;
  error: string | null;
}

interface NotebookChatActions {
  // File management
  loadFiles: () => Promise<void>;
  createFile: () => NotebookFile;
  setActiveFile: (id: string | null) => void;
  updateFileMetadata: (id: string, updates: Partial<Omit<NotebookFile, 'id' | 'messages'>>) => void;
  deleteFile: (id: string) => void;
  
  // Message management
  setMessages: (messages: AiChatMessage[]) => void;
  addMessage: (message: AiChatMessage) => void;
  updateMessage: (id: string, updates: Partial<AiChatMessage>) => void;
  removeMessagesFromIndex: (fromIndex: number) => void;
  
  // Chat state
  setSendingMessage: (isSending: boolean) => void;
  setError: (error: string | null) => void;
  
  // Internal actions
  _saveToStorage: () => void;
}

const generateId = (): string => {
  return `notebook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const getTitleFromMessages = (messages: AiChatMessage[]): string => {
  const firstUserMessage = messages.find(msg => msg.role === 'user');
  if (!firstUserMessage) return 'Untitled';

  // Extract first line of first user message
  const content = firstUserMessage.content || '';
  const firstLine = content.split('\n')[0].trim();
  return firstLine.slice(0, 50) + (firstLine.length > 50 ? '...' : '') || 'Untitled';
};

export const useNotebookChatStore = create<NotebookChatState & NotebookChatActions>()(
  subscribeWithSelector((set, get) => {
    // Debounced save function
    const debouncedSave = debounce(async () => {
      const state = get();
      await storage.setNotebookFiles({
        files: state.files,
        lastActiveFileId: state.activeFileId,
      });
    }, 500);

    return {
      // Initial state
      files: {},
      activeFileId: null,
      isLoadingFiles: false,
      messages: [],
      isLoadingMessages: false,
      isSendingMessage: false,
      error: null,

      // File management actions
      loadFiles: async () => {
        set({ isLoadingFiles: true });
        try {
          const data = await storage.getNotebookFiles();
          set({ 
            files: data.files, 
            activeFileId: data.lastActiveFileId,
            isLoadingFiles: false 
          });
          
          // Load messages for active file
          if (data.lastActiveFileId && data.files[data.lastActiveFileId]) {
            set({ 
              messages: data.files[data.lastActiveFileId].messages || [],
              isLoadingMessages: false 
            });
          }
        } catch (error) {
          console.error('Failed to load notebook files:', error);
          set({ isLoadingFiles: false });
        }
      },

      createFile: () => {
        const now = new Date().toISOString();
        const newFile: NotebookFile = {
          id: generateId(),
          createdAt: now,
          updatedAt: now,
          title: 'Untitled',
          cells: [],
          messages: [],
        };

        set(state => ({
          files: { ...state.files, [newFile.id]: newFile },
          activeFileId: newFile.id,
          messages: [], // Clear messages when switching to new file
        }));

        get()._saveToStorage();
        return newFile;
      },

      setActiveFile: (id: string | null) => {
        const state = get();
        
        // Save current messages to the previously active file before switching
        if (state.activeFileId && state.activeFileId !== id) {
          const currentFile = state.files[state.activeFileId];
          if (currentFile) {
            const updatedFile = {
              ...currentFile,
              messages: state.messages,
              updatedAt: new Date().toISOString(),
              title: getTitleFromMessages(state.messages) || currentFile.title,
            };
            
            set(state => ({
              files: { ...state.files, [state.activeFileId!]: updatedFile }
            }));
          }
        }

        // Load messages for the new active file
        const newMessages = id && state.files[id] ? state.files[id].messages : [];
        
        set({
          activeFileId: id,
          messages: newMessages,
          error: null, // Clear any existing errors when switching files
        });

        get()._saveToStorage();
      },

      updateFileMetadata: (id: string, updates: Partial<Omit<NotebookFile, 'id' | 'messages'>>) => {
        set(state => ({
          files: {
            ...state.files,
            [id]: { ...state.files[id], ...updates, updatedAt: new Date().toISOString() },
          }
        }));
        get()._saveToStorage();
      },

      deleteFile: (id: string) => {
        set(state => {
          const { [id]: removedFile, ...remainingFiles } = state.files;
          void removedFile; // Acknowledge unused variable
          return {
            files: remainingFiles,
            activeFileId: state.activeFileId === id ? null : state.activeFileId,
            messages: state.activeFileId === id ? [] : state.messages,
          };
        });
        get()._saveToStorage();
      },

      // Message management actions
      setMessages: (messages: AiChatMessage[]) => {
        set({ messages });
        
        // Update the active file with new messages
        const state = get();
        if (state.activeFileId) {
          const currentFile = state.files[state.activeFileId];
          if (currentFile) {
            const updatedFile = {
              ...currentFile,
              messages,
              updatedAt: new Date().toISOString(),
              title: getTitleFromMessages(messages) || currentFile.title,
            };
            
            set(state => ({
              files: { ...state.files, [state.activeFileId!]: updatedFile }
            }));
          }
        }
        
        get()._saveToStorage();
      },

      addMessage: (message: AiChatMessage) => {
        set(state => ({ messages: [...state.messages, message] }));
        
        // Update the active file
        const state = get();
        if (state.activeFileId) {
          get().setMessages(state.messages); // This will handle file update and save
        }
      },

      updateMessage: (id: string, updates: Partial<AiChatMessage>) => {
        set(state => ({
          messages: state.messages.map(msg => 
            msg.id === id ? { ...msg, ...updates } : msg
          )
        }));
        
        // Update the active file
        const state = get();
        if (state.activeFileId) {
          get().setMessages(state.messages); // This will handle file update and save
        }
      },

      removeMessagesFromIndex: (fromIndex: number) => {
        set(state => ({
          messages: state.messages.slice(0, fromIndex)
        }));
        
        // Update the active file
        const state = get();
        if (state.activeFileId) {
          get().setMessages(state.messages); // This will handle file update and save
        }
      },

      // Chat state actions
      setSendingMessage: (isSending: boolean) => {
        set({ isSendingMessage: isSending });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      // Internal action for saving to storage
      _saveToStorage: () => {
        debouncedSave();
      },
    };
  })
);