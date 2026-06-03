import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { clearTokens } from '../lib/api'; // Remove if completely removing api.ts later

interface AuthState {
  session: any | null;
  userId: string | null;
  deviceId: number | null;
  isKeysGenerated: boolean;
  user: { name?: string; phone?: string; email?: string } | null;
  setSession: (session: any | null) => void;
  setDeviceId: (id: number | null) => void;
  setKeysGenerated: (status: boolean) => void;
  setUser: (user: any) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  userId: null,
  deviceId: typeof window !== 'undefined' && localStorage.getItem('deviceId') ? parseInt(localStorage.getItem('deviceId')!, 10) : null,
  isKeysGenerated: typeof window !== 'undefined' ? localStorage.getItem('isKeysGenerated') === 'true' : false,
  user: null,
  
  setSession: (session) => {
    set({ session, userId: session?.user?.id || null });
  },
  
  setDeviceId: (deviceId) => {
    if (typeof window !== 'undefined') {
      if (deviceId) localStorage.setItem('deviceId', deviceId.toString());
      else localStorage.removeItem('deviceId');
    }
    set({ deviceId });
  },
  
  setKeysGenerated: (status) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('isKeysGenerated', String(status));
    }
    set({ isKeysGenerated: status });
  },
  
  setUser: (user) => set({ user }),
  
  clearAuth: async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('deviceId');
      localStorage.removeItem('isKeysGenerated');
      clearTokens();
    }
    await supabase.auth.signOut();
    set({ session: null, userId: null, deviceId: null, isKeysGenerated: false, user: null });
  }
}));

// Initialize listener
if (typeof window !== 'undefined') {
  supabase.auth.getSession().then(({ data: { session } }) => {
    useAuthStore.getState().setSession(session);
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.getState().setSession(session);
  });
}

