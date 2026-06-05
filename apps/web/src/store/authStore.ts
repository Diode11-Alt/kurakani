import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  userId: string | null;
  deviceId: number | null;
  user: { name?: string; phone?: string; email?: string } | null;
  isLoading: boolean; // True until first session check completes
  setSession: (session: Session | null) => void;
  setDeviceId: (id: number | null) => void;
  setUser: (user: AuthState['user']) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  userId: null,
  deviceId: typeof window !== 'undefined' && localStorage.getItem('deviceId') ? parseInt(localStorage.getItem('deviceId')!, 10) : null,
  user: null,
  isLoading: true, // Start true to prevent flash-redirect to /login
  
  setSession: (session) => {
    set({ session, userId: session?.user?.id || null, isLoading: false });
  },
  
  setDeviceId: (deviceId) => {
    if (typeof window !== 'undefined') {
      if (deviceId) localStorage.setItem('deviceId', deviceId.toString());
      else localStorage.removeItem('deviceId');
    }
    set({ deviceId });
  },
  
  setUser: (user) => set({ user }),
  
  clearAuth: async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('deviceId');
    }
    // Single auth system: Supabase only
    await supabase.auth.signOut();
    set({ session: null, userId: null, deviceId: null, user: null, isLoading: false });
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
