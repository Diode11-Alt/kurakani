import { create } from 'zustand';

interface AppState {
  isOnline: boolean;
  registrationStatus: 'unregistered' | 'registering' | 'registered';
  activeCall: { callId: string; type: 'audio' | 'video'; peerId: string } | null;
  jwt: string | null;
  userId: string | null;
  isKeysGenerated: boolean;
  user: { name?: string; phone?: string; email?: string } | null;
  setOnlineStatus: (status: boolean) => void;
  setRegistrationStatus: (status: 'unregistered' | 'registering' | 'registered') => void;
  setActiveCall: (call: { callId: string; type: 'audio' | 'video'; peerId: string } | null) => void;
  setJwt: (jwt: string | null) => void;
  setUserId: (id: string | null) => void;
  setKeysGenerated: (status: boolean) => void;
  setUser: (user: any) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isOnline: false,
  registrationStatus: 'unregistered',
  activeCall: null,
  jwt: typeof window !== 'undefined' ? localStorage.getItem('jwt') : null,
  userId: typeof window !== 'undefined' ? localStorage.getItem('userId') : null,
  isKeysGenerated: typeof window !== 'undefined' ? localStorage.getItem('isKeysGenerated') === 'true' : false,
  user: null,
  setOnlineStatus: (status) => set({ isOnline: status }),
  setRegistrationStatus: (status) => set({ registrationStatus: status }),
  setActiveCall: (call) => set({ activeCall: call }),
  setJwt: (jwt) => {
    if (typeof window !== 'undefined') {
      if (jwt) localStorage.setItem('jwt', jwt);
      else localStorage.removeItem('jwt');
    }
    set({ jwt });
  },
  setUserId: (userId) => {
    if (typeof window !== 'undefined') {
      if (userId) localStorage.setItem('userId', userId);
      else localStorage.removeItem('userId');
    }
    set({ userId });
  },
  setKeysGenerated: (status) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('isKeysGenerated', String(status));
    }
    set({ isKeysGenerated: status });
  },
  setUser: (user) => set({ user }),
}));
