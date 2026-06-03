import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  setUser: (user: any) => void;
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
    const jwt = await AsyncStorage.getItem('signal_token');
    const refreshToken = await AsyncStorage.getItem('signal_refresh_token');
    const userId = await AsyncStorage.getItem('signal_userId');
    const deviceIdStr = await AsyncStorage.getItem('signal_deviceId');
    const isKeysGenerated = await AsyncStorage.getItem('signal_isKeysGenerated');
    const userStr = await AsyncStorage.getItem('signal_user');
    set({
      jwt,
      refreshToken,
      userId,
      deviceId: deviceIdStr ? parseInt(deviceIdStr, 10) : null,
      isKeysGenerated: isKeysGenerated === 'true',
      user: userStr ? JSON.parse(userStr) : null,
    });
  },
  setJwt: (jwt) => {
    if (jwt) AsyncStorage.setItem('signal_token', jwt);
    else AsyncStorage.removeItem('signal_token');
    set({ jwt });
  },
  setRefreshToken: (refreshToken) => {
    if (refreshToken) AsyncStorage.setItem('signal_refresh_token', refreshToken);
    else AsyncStorage.removeItem('signal_refresh_token');
    set({ refreshToken });
  },
  setUserId: (userId) => {
    if (userId) AsyncStorage.setItem('signal_userId', userId);
    else AsyncStorage.removeItem('signal_userId');
    set({ userId });
  },
  setDeviceId: (deviceId) => {
    if (deviceId) AsyncStorage.setItem('signal_deviceId', deviceId.toString());
    else AsyncStorage.removeItem('signal_deviceId');
    set({ deviceId });
  },
  setKeysGenerated: (status) => {
    AsyncStorage.setItem('signal_isKeysGenerated', String(status));
    set({ isKeysGenerated: status });
  },
  setUser: (user) => {
    if (user) AsyncStorage.setItem('signal_user', JSON.stringify(user));
    else AsyncStorage.removeItem('signal_user');
    set({ user });
  },
  clearAuth: () => {
    AsyncStorage.removeItem('signal_token');
    AsyncStorage.removeItem('signal_refresh_token');
    AsyncStorage.removeItem('signal_userId');
    AsyncStorage.removeItem('signal_deviceId');
    AsyncStorage.removeItem('signal_isKeysGenerated');
    AsyncStorage.removeItem('signal_user');
    set({ jwt: null, refreshToken: null, userId: null, deviceId: null, isKeysGenerated: false, user: null });
  }
}));
