/**
 * Typed API client for Kurakani backend.
 * Wraps fetch with auth headers and error handling.
 */

import { get, set, del } from 'idb-keyval';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export async function setTokens(access: string, refresh: string) {
  if (typeof window !== 'undefined') {
    await set('accessToken', access);
    await set('refreshToken', refresh);
  }
}

export async function getAccessToken(): Promise<string | null> {
  if (typeof window !== 'undefined') {
    return await get<string>('accessToken') || null;
  }
  return null;
}

export async function getRefreshToken(): Promise<string | null> {
  if (typeof window !== 'undefined') {
    return await get<string>('refreshToken') || null;
  }
  return null;
}

export async function clearTokens() {
  if (typeof window !== 'undefined') {
    await del('accessToken');
    await del('refreshToken');
  }
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

async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
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
  if (res.status === 401 && token) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const newToken = await getAccessToken();
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || error.message || 'API request failed');
  }

  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────

export async function register(data: {
  email: string;
  password: string;
  username: string;
  phoneNumber?: string;
  serverPayload: Record<string, unknown>;
}) {
  const result = await apiFetch<{
    success: boolean;
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; username: string; registrationId: number };
  }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  await setTokens(result.accessToken, result.refreshToken);
  return result;
}

export async function login(data: {
  email: string;
  password: string;
  serverPayload: Record<string, unknown>;
}) {
  const result = await apiFetch<{
    success: boolean;
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; username: string; registrationId: number };
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  await setTokens(result.accessToken, result.refreshToken);
  return result;
}

export async function logout() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } finally {
    await clearTokens();
  }
}

// ─── Keys ─────────────────────────────────────────────────

export async function fetchKeyBundle(userId: string) {
  return apiFetch<{
    identityKey: string;
    registrationId: number;
    signedPreKey: { keyId: number; publicKey: string; signature: string };
    oneTimePreKey: { keyId: number; publicKey: string } | null;
  }>(`/keys/${userId}`);
}

export async function uploadKeyBundle(bundle: {
  identityKey: string;
  signedPreKey: { keyId: number; publicKey: string; signature: string };
  oneTimePreKeys: { keyId: number; publicKey: string }[];
}) {
  return apiFetch('/keys/register', {
    method: 'POST',
    body: JSON.stringify(bundle),
  });
}

export async function getOTPKCount() {
  return apiFetch<{ count: number }>('/keys/count');
}

// ─── Messages ─────────────────────────────────────────────

export async function sendMessage(data: {
  recipientId: string;
  conversationId?: string;
  ciphertext: string;
  ciphertextType: number;
  contentType?: string;
}) {
  return apiFetch<{
    messageId: string;
    conversationId: string;
    timestamp: string;
  }>('/messages', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getConversations() {
  return apiFetch<{
    conversations: Array<{
      id: string;
      type: string;
      name: string | null;
      updatedAt: string;
      members: Array<{
        userId: string;
        username: string;
        displayName: string | null;
        avatarUrl: string | null;
        role: string;
      }>;
    }>;
  }>('/messages/conversations');
}

export async function getMessages(conversationId: string, before?: string, limit = 50) {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (before) params.set('before', before);
  return apiFetch<{
    messages: Array<{
      id: string;
      senderId: string;
      ciphertext: string;
      ciphertextType: number;
      contentType: string;
      sentAt: string;
      deliveredAt: string | null;
      readAt: string | null;
    }>;
    hasMore: boolean;
    nextCursor: string | null;
  }>(`/messages/conversations/${conversationId}/messages?${params}`);
}

export async function getPendingMessages() {
  return apiFetch<{ messages: Record<string, unknown>[]; count: number }>('/messages/pending');
}

export async function markAsRead(messageId: string) {
  return apiFetch(`/messages/${messageId}/read`, { method: 'PUT' });
}

// ─── Users ────────────────────────────────────────────────

export async function getProfile() {
  return apiFetch<{
    userId: string;
    username: string;
    displayName: string | null;
    bio: string | null;
    avatarUrl: string | null;
    email: string;
    createdAt: string;
  }>('/users/me');
}

export async function updateProfile(data: { displayName?: string; bio?: string; username?: string }) {
  return apiFetch('/users/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function searchUsers(query: string) {
  return apiFetch<{
    users: Array<{
      userId: string;
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
    }>;
  }>(`/users/search?q=${encodeURIComponent(query)}`);
}

export async function deleteAccount() {
  return apiFetch<{
    scheduledDeletionAt: string;
    message: string;
  }>('/users/me', { method: 'DELETE' });
}

export async function getUserById(id: string) {
  return apiFetch<{
    userId: string;
    username: string;
    displayName: string | null;
    bio: string | null;
    avatarUrl: string | null;
    createdAt: string;
  }>(`/users/${id}`);
}

// ─── Settings ─────────────────────────────────────────────

export async function getPrivacySettings() {
  return apiFetch<{
    lastSeen: string;
    readReceipts: boolean;
    profilePhotoVisibility: string;
  }>('/settings/privacy');
}

export async function updatePrivacySettings(data: {
  lastSeen?: string;
  readReceipts?: boolean;
  profilePhotoVisibility?: string;
}) {
  return apiFetch('/settings/privacy', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getNotificationSettings() {
  return apiFetch<{
    pushNotifications: boolean;
    notificationPreview: boolean;
  }>('/settings/notifications');
}

export async function updateNotificationSettings(data: {
  pushNotifications?: boolean;
  notificationPreview?: boolean;
}) {
  return apiFetch('/settings/notifications', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ─── Attachments ──────────────────────────────────────────

export async function getUploadUrl(contentType: string, size: number) {
  return apiFetch<{ uploadUrl: string; s3Key: string }>(
    `/attachments/upload-url?contentType=${encodeURIComponent(contentType)}&size=${size}`
  );
}

export async function getDownloadUrl(s3Key: string) {
  return apiFetch<{ downloadUrl: string }>(
    `/attachments/download-url?s3Key=${encodeURIComponent(s3Key)}`
  );
}

// ─── TURN ─────────────────────────────────────────────────

export async function getTurnCredentials() {
  return apiFetch<{
    iceServers: Array<{
      urls: string | string[];
      username?: string;
      credential?: string;
    }>;
  }>('/turn');
}

// ─── Health ───────────────────────────────────────────────

export async function healthCheck() {
  return apiFetch<{
    status: string;
    database: string;
    redis: string;
  }>('/health');
}
