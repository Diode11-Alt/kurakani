import { create } from 'zustand';

interface UIState {
  isOnline: boolean;
  registrationStatus: 'unregistered' | 'registering' | 'registered';
  activeCall: { callId: string; type: 'audio' | 'video'; peerId: string } | null;
  setOnlineStatus: (status: boolean) => void;
  setRegistrationStatus: (status: 'unregistered' | 'registering' | 'registered') => void;
  setActiveCall: (call: { callId: string; type: 'audio' | 'video'; peerId: string } | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isOnline: true,
  registrationStatus: 'unregistered',
  activeCall: null,
  setOnlineStatus: (status) => set({ isOnline: status }),
  setRegistrationStatus: (status) => set({ registrationStatus: status }),
  setActiveCall: (call) => set({ activeCall: call }),
}));
