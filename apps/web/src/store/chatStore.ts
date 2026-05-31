import { create } from 'zustand';

interface ChatState {
  activeConversationId: string | null;
  typingIndicators: Record<string, boolean>; // userId -> isTyping
  setActiveConversation: (id: string | null) => void;
  setTypingIndicator: (userId: string, isTyping: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeConversationId: null,
  typingIndicators: {},
  setActiveConversation: (id) => set({ activeConversationId: id }),
  setTypingIndicator: (userId, isTyping) =>
    set((state) => ({
      typingIndicators: { ...state.typingIndicators, [userId]: isTyping },
    })),
}));
