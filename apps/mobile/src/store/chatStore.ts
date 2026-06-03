import { create } from 'zustand';

export interface Conversation {
  id: string;
  isGroup: boolean;
  name: string | null;
  lastMessageAt: string;
  members: any[];
}

interface ChatState {
  conversations: Conversation[];
  setConversations: (convs: Conversation[]) => void;
  updateConversationTimestamp: (id: string, timestamp: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  setConversations: (convs) => set({ conversations: convs }),
  updateConversationTimestamp: (id, timestamp) => set((state) => ({
    conversations: state.conversations.map(c => 
      c.id === id ? { ...c, lastMessageAt: timestamp } : c
    ).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
  }))
}));
