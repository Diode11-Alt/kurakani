import { create } from 'zustand';
import EncryptedStorage from 'react-native-encrypted-storage';

interface AuthState {
  jwt: string | null;
  refreshToken: string | null;
  userId: string | null;
  deviceId: number | null;
  isKeysGenerated: boolean;
  user: { name?: string; phone?: string; email?: string } | null;
  setJwt: (jwt: string | null) => void;
  setRefreshToken: (token: string | null) => void;
  setUserId: (id: string | null) => void;
  setDeviceId: (id: number | null) => void;
  setKeysGenerated: (status: boolean) => void;
  setUser: (user: Record<string, unknown> | null) => void;
  clearAuth: () => void;
  init: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  jwt: null,
  refreshToken: null,
  userId: null,
  deviceId: null,
  isKeysGenerated: false,
  user: null,
  init: async () => {
    try {
      const jwt = await EncryptedStorage.getItem('signal_token');
      const refreshToken = await EncryptedStorage.getItem('signal_refresh_token');
      const userId = await EncryptedStorage.getItem('signal_userId');
      const deviceIdStr = await EncryptedStorage.getItem('signal_deviceId');
      const isKeysGenerated = await EncryptedStorage.getItem('signal_isKeysGenerated');
      const userStr = await EncryptedStorage.getItem('signal_user');
      set({
        jwt,
        refreshToken,
        userId,
        deviceId: deviceIdStr ? parseInt(deviceIdStr, 10) : null,
        isKeysGenerated: isKeysGenerated === 'true',
        user: userStr ? JSON.parse(userStr) : null,
      });
    } catch (e) {
      console.error('Failed to init EncryptedStorage', e);
    }
  },
  setJwt: (jwt) => {
    if (jwt) EncryptedStorage.setItem('signal_token', jwt).catch(console.error);
    else EncryptedStorage.removeItem('signal_token').catch(console.error);
    set({ jwt });
  },
  setRefreshToken: (refreshToken) => {
    if (refreshToken) EncryptedStorage.setItem('signal_refresh_token', refreshToken).catch(console.error);
    else EncryptedStorage.removeItem('signal_refresh_token').catch(console.error);
    set({ refreshToken });
  },
  setUserId: (userId) => {
    if (userId) EncryptedStorage.setItem('signal_userId', userId).catch(console.error);
    else EncryptedStorage.removeItem('signal_userId').catch(console.error);
    set({ userId });
  },
  setDeviceId: (deviceId) => {
    if (deviceId) EncryptedStorage.setItem('signal_deviceId', deviceId.toString()).catch(console.error);
    else EncryptedStorage.removeItem('signal_deviceId').catch(console.error);
    set({ deviceId });
  },
  setKeysGenerated: (status) => {
    EncryptedStorage.setItem('signal_isKeysGenerated', String(status)).catch(console.error);
    set({ isKeysGenerated: status });
  },
  setUser: (user) => {
    if (user) EncryptedStorage.setItem('signal_user', JSON.stringify(user)).catch(console.error);
    else EncryptedStorage.removeItem('signal_user').catch(console.error);
    set({ user });
  },
  clearAuth: () => {
    EncryptedStorage.removeItem('signal_token').catch(console.error);
    EncryptedStorage.removeItem('signal_refresh_token').catch(console.error);
    EncryptedStorage.removeItem('signal_userId').catch(console.error);
    EncryptedStorage.removeItem('signal_deviceId').catch(console.error);
    EncryptedStorage.removeItem('signal_isKeysGenerated').catch(console.error);
    EncryptedStorage.removeItem('signal_user').catch(console.error);
    set({ jwt: null, refreshToken: null, userId: null, deviceId: null, isKeysGenerated: false, user: null });
  }
}));
