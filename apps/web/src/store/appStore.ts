import { create } from 'zustand';

interface AppState {
  isOnline: boolean;
  registrationStatus: 'unregistered' | 'registering' | 'registered';
  activeCall: { callId: string; type: 'audio' | 'video'; peerId: string } | null;
  setOnlineStatus: (status: boolean) => void;
  setRegistrationStatus: (status: 'unregistered' | 'registering' | 'registered') => void;
  setActiveCall: (call: { callId: string; type: 'audio' | 'video'; peerId: string } | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isOnline: false,
  registrationStatus: 'unregistered',
  activeCall: null,
  setOnlineStatus: (status) => set({ isOnline: status }),
  setRegistrationStatus: (status) => set({ registrationStatus: status }),
  setActiveCall: (call) => set({ activeCall: call }),
}));
