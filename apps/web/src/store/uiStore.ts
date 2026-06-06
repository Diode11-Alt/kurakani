import { create } from 'zustand';
import { User } from '../types';

export interface ActiveCallState {
  conversationId: string;
  callType: 'video' | 'audio';
  otherUser: User | { username: string; [key: string]: unknown };
  incomingOfferPayload?: Record<string, unknown>;
}

interface UIState {
  isOnline: boolean;
  registrationStatus: 'unregistered' | 'registering' | 'registered';
  activeCall: ActiveCallState | null;
  onlineUsers: Record<string, boolean>;
  isNotificationsOpen: boolean;
  setOnlineStatus: (status: boolean) => void;
  setRegistrationStatus: (status: 'unregistered' | 'registering' | 'registered') => void;
  setActiveCall: (call: ActiveCallState | null) => void;
  setOnlineUsers: (users: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
  setIsNotificationsOpen: (isOpen: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isOnline: true, // Optimistically assume online
  registrationStatus: 'unregistered',
  activeCall: null,
  onlineUsers: {},
  isNotificationsOpen: false,
  setOnlineStatus: (status) => set({ isOnline: status }),
  setRegistrationStatus: (status) => set({ registrationStatus: status }),
  setActiveCall: (call) => set({ activeCall: call }),
  setOnlineUsers: (updater) => set((state) => ({
    onlineUsers: typeof updater === 'function' ? updater(state.onlineUsers) : updater
  })),
  setIsNotificationsOpen: (isOpen) => set({ isNotificationsOpen: isOpen }),
}));
