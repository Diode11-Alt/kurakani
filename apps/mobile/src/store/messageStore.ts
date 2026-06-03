import { create } from 'zustand';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  ciphertext: string;
  ciphertextType: string;
  contentType: string;
  sentAt: string;
  deliveredAt?: string | null;
  readAt?: string | null;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
}

interface MessageState {
  messages: Record<string, Message[]>; // conversationId -> Message[]
  addMessage: (conversationId: string, message: Message) => void;
  updateMessageStatus: (conversationId: string, messageId: string, status: Message['status'], updates?: Partial<Message>) => void;
  setMessages: (conversationId: string, messages: Message[]) => void;
  appendMessages: (conversationId: string, messages: Message[]) => void;
}

export const useMessageStore = create<MessageState>((set) => ({
  messages: {},
  
  addMessage: (conversationId, message) => set((state) => ({
    messages: {
      ...state.messages,
      [conversationId]: [...(state.messages[conversationId] || []), { status: 'sending', ...message }],
    }
  })),

  updateMessageStatus: (conversationId, messageId, status, updates) => set((state) => {
    const convMessages = state.messages[conversationId] || [];
    const messageIndex = convMessages.findIndex(m => m.id === messageId);
    
    if (messageIndex === -1) return state;

    const newMessages = [...convMessages];
    newMessages[messageIndex] = { ...newMessages[messageIndex], status, ...updates };

    return {
      messages: {
        ...state.messages,
        [conversationId]: newMessages,
      }
    };
  }),

  setMessages: (conversationId, messages) => set((state) => ({
    messages: {
      ...state.messages,
      [conversationId]: messages,
    }
  })),

  appendMessages: (conversationId, messages) => set((state) => ({
    messages: {
      ...state.messages,
      [conversationId]: [...messages, ...(state.messages[conversationId] || [])],
    }
  })),
}));
