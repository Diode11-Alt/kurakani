import { create } from 'zustand';

export interface ActiveCallState {
  conversationId: string;
  callType: 'video' | 'audio';
  otherUser: any;
  incomingOfferPayload?: any;
}

interface UIState {
  isOnline: boolean;
  registrationStatus: 'unregistered' | 'registering' | 'registered';
  activeCall: ActiveCallState | null;
  setOnlineStatus: (status: boolean) => void;
  setRegistrationStatus: (status: 'unregistered' | 'registering' | 'registered') => void;
  setActiveCall: (call: ActiveCallState | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isOnline: true, // Optimistically assume online
  registrationStatus: 'unregistered',
  activeCall: null,
  setOnlineStatus: (status) => set({ isOnline: status }),
  setRegistrationStatus: (status) => set({ registrationStatus: status }),
  setActiveCall: (call) => set({ activeCall: call }),
}));
