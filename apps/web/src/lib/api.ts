/**
 * API client for Kurakani — now fully backed by Supabase.
 * Legacy JWT token system has been removed (CRIT-05).
 * All operations go through the Supabase client SDK.
 */

import { supabase } from './supabase';


// ─── Auth ─────────────────────────────────────────────────

export async function logout() {
  await supabase.auth.signOut();
}

// ─── Users ────────────────────────────────────────────────

export async function getProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('users')
    .select('id, email, username, display_name, bio, avatar_url, created_at')
    .eq('id', user.id)
    .single();

  if (error) throw new Error(error.message);
  return {
    userId: data.id,
    username: data.username,
    displayName: data.display_name,
    bio: data.bio,
    avatarUrl: data.avatar_url,
    email: data.email,
    createdAt: data.created_at,
  };
}

export async function updateProfile(updates: { displayName?: string; bio?: string; username?: string }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('users')
    .update({
      ...(updates.displayName !== undefined && { display_name: updates.displayName }),
      ...(updates.bio !== undefined && { bio: updates.bio }),
      ...(updates.username !== undefined && { username: updates.username }),
    })
    .eq('id', user.id);

  if (error) throw new Error(error.message);
  return { success: true };
}

export async function getUserById(id: string) {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, display_name, bio, avatar_url, created_at')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return {
    userId: data.id,
    username: data.username,
    displayName: data.display_name,
    bio: data.bio,
    avatarUrl: data.avatar_url,
    createdAt: data.created_at,
  };
}

export async function searchUsers(query: string) {
  if (!query || query.length < 2) return { users: [] };
  
  // Sanitize input to prevent ReDoS and use prefix matching for index use
  const safeQuery = query.replace(/[%_\\]/g, '');
  if (safeQuery.length < 2) return { users: [] };

  const { data, error } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url')
    .or(`username.ilike.${safeQuery}%,display_name.ilike.${safeQuery}%`)
    .limit(20);

  if (error) throw new Error(error.message);
  return {
    users: (data || []).map(u => ({
      userId: u.id,
      username: u.username,
      displayName: u.display_name,
      avatarUrl: u.avatar_url,
    })),
  };
}

export async function deleteAccount() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Schedule deletion
  const { error } = await supabase
    .from('users')
    .update({ deletion_scheduled_at: new Date().toISOString(), is_active: false })
    .eq('id', user.id);

  if (error) throw new Error(error.message);
  await supabase.auth.signOut();
  return { scheduledDeletionAt: new Date().toISOString(), message: 'Account scheduled for deletion' };
}

// ─── Settings ─────────────────────────────────────────────

export async function getPrivacySettings() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('user_settings')
    .select('last_seen, read_receipts, profile_photo_visibility')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') throw new Error(error.message);

  return {
    lastSeen: data?.last_seen || 'everyone',
    readReceipts: data?.read_receipts ?? true,
    profilePhotoVisibility: data?.profile_photo_visibility || 'everyone',
  };
}

export async function updatePrivacySettings(updates: {
  lastSeen?: string;
  readReceipts?: boolean;
  profilePhotoVisibility?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: user.id,
      ...(updates.lastSeen !== undefined && { last_seen: updates.lastSeen }),
      ...(updates.readReceipts !== undefined && { read_receipts: updates.readReceipts }),
      ...(updates.profilePhotoVisibility !== undefined && { profile_photo_visibility: updates.profilePhotoVisibility }),
      updated_at: new Date().toISOString(),
    });

  if (error) throw new Error(error.message);
  return { success: true };
}

export async function getNotificationSettings() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('user_settings')
    .select('push_notifications, notification_preview')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') throw new Error(error.message);

  return {
    pushNotifications: data?.push_notifications ?? true,
    notificationPreview: data?.notification_preview ?? false,
  };
}

export async function updateNotificationSettings(updates: {
  pushNotifications?: boolean;
  notificationPreview?: boolean;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: user.id,
      ...(updates.pushNotifications !== undefined && { push_notifications: updates.pushNotifications }),
      ...(updates.notificationPreview !== undefined && { notification_preview: updates.notificationPreview }),
      updated_at: new Date().toISOString(),
    });

  if (error) throw new Error(error.message);
  return { success: true };
}

// ─── Keys ─────────────────────────────────────────────────

export async function fetchKeyBundle(userId: string) {
  const { data: ik, error: ikErr } = await supabase
    .from('identity_keys')
    .select('identity_key, device_id')
    .eq('user_id', userId)
    .single();
  if (ikErr) throw new Error(ikErr.message);

  const { data: user } = await supabase
    .from('users')
    .select('registration_id')
    .eq('id', userId)
    .single();

  const { data: spk, error: spkErr } = await supabase
    .from('signed_pre_keys')
    .select('key_id, public_key, signature')
    .eq('user_id', userId)
    .single();
  if (spkErr) throw new Error(spkErr.message);

  const { data: otpk } = await supabase.rpc('fetch_otpk', { target_user_id: userId }).maybeSingle();

  return {
    identityKey: ik.identity_key,
    registrationId: user?.registration_id || 0,
    signedPreKey: {
      keyId: spk.key_id,
      publicKey: spk.public_key,
      signature: spk.signature,
    },
    oneTimePreKey: otpk ? { keyId: otpk.key_id, publicKey: otpk.public_key } : null,
  };
}
