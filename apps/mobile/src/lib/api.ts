import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:4000/api';

async function getAccessToken(): Promise<string | null> {
  return await AsyncStorage.getItem('signal_token');
}

async function getRefreshToken(): Promise<string | null> {
  return await AsyncStorage.getItem('signal_refresh_token');
}

export async function setTokens(access: string, refresh: string) {
  await AsyncStorage.setItem('signal_token', access);
  await AsyncStorage.setItem('signal_refresh_token', refresh);
}

export async function clearTokens() {
  await AsyncStorage.removeItem('signal_token');
  await AsyncStorage.removeItem('signal_refresh_token');
}

async function refreshAccessToken(refreshToken?: string): Promise<boolean> {
  const rt = refreshToken || (await getRefreshToken());
  if (!rt) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    await setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // Auto-refresh on 401
  if (res.status === 401 && token && !path.includes('/auth/refresh')) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const newToken = await getAccessToken();
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    }
  }

  if (!res.ok) {
    let errorMessage = res.statusText || 'API request failed';
    try {
      const errorData = await res.json();
      if (errorData.message) errorMessage = errorData.message;
      else if (errorData.error) errorMessage = errorData.error;
    } catch (e) {
      // ignore json parse error
    }

    if (!path.includes('/auth/login') && !path.includes('/auth/register') && !path.includes('/auth/refresh')) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
      });
    }

    throw new Error(errorMessage);
  }

  return res.json();
}
