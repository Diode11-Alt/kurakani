import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { get, set as setIDB, del } from 'idb-keyval';

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

export const useAuthStore = create<AuthState>((setStore) => ({
  session: null,
  userId: null,
  deviceId: null,
  user: null,
  isLoading: true, // Start true to prevent flash-redirect to /login
  
  setSession: (session) => {
    setStore({ session, userId: session?.user?.id || null, isLoading: false });
  },
  
  setDeviceId: (deviceId) => {
    if (typeof window !== 'undefined') {
      if (deviceId) setIDB('deviceId', deviceId).catch(console.error);
      else del('deviceId').catch(console.error);
    }
    setStore({ deviceId });
  },
  
  setUser: (user) => setStore({ user }),
  
  clearAuth: async () => {
    if (typeof window !== 'undefined') {
      del('deviceId').catch(console.error);
    }
    // Single auth system: Supabase only
    await supabase.auth.signOut();
    setStore({ session: null, userId: null, deviceId: null, user: null, isLoading: false });
  }
}));

// Initialize listener
if (typeof window !== 'undefined') {
  get('deviceId').then((id) => {
    if (id) useAuthStore.getState().setDeviceId(id as number);
  }).catch(console.error);

  supabase.auth.getSession().then(({ data: { session } }) => {
    useAuthStore.getState().setSession(session);
  }).catch((error) => {
    console.warn("Failed to get session:", error);
    useAuthStore.getState().setSession(null);
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.getState().setSession(session);
  });
}
