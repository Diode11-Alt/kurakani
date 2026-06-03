import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  userId: string | null;
  deviceId: number | null;
  isKeysGenerated: boolean;
  user: { name?: string; phone?: string; email?: string } | null;
  setSession: (session: Session | null) => void;
  setDeviceId: (id: number | null) => void;
  setKeysGenerated: (status: boolean) => void;
  setUser: (user: AuthState['user']) => void;
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
    }
    // Single auth system: Supabase only
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
