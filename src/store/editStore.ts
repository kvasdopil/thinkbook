import { create } from 'zustand';

interface EditState {
  editingMessageId: string | null;
  setEditingMessageId: (id: string | null) => void;
}

export const useEditStore = create<EditState>((set) => ({
  editingMessageId: null,
  setEditingMessageId: (id) => set({ editingMessageId: id }),
}));
