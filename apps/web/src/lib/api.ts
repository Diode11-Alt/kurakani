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
    .select('id, email, username, display_name, bio, avatar_url, created_at, cover_url, is_verified, pronouns, website, location, work, education, profile_views')
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
    coverUrl: data.cover_url,
    isVerified: data.is_verified,
    pronouns: data.pronouns,
    website: data.website,
    location: data.location,
    work: data.work,
    education: data.education,
    profileViews: data.profile_views,
  };
}

export async function updateProfile(updates: { 
  displayName?: string; 
  bio?: string; 
  username?: string;
  coverUrl?: string;
  pronouns?: string;
  website?: string;
  location?: string;
  work?: string;
  education?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (updates.username && !/^[a-zA-Z0-9_]{3,20}$/.test(updates.username)) {
    throw new Error('Username must be 3-20 characters and contain only letters, numbers, and underscores');
  }
  if (updates.bio && updates.bio.length > 160) {
    throw new Error('Bio must be 160 characters or less');
  }
  if (updates.displayName && updates.displayName.length > 50) {
    throw new Error('Display name must be 50 characters or less');
  }
  if (updates.website && !updates.website.startsWith('http')) {
    throw new Error('Website must start with http or https');
  }

  const { error } = await supabase
    .from('users')
    .update({
      ...(updates.displayName !== undefined && { display_name: updates.displayName }),
      ...(updates.bio !== undefined && { bio: updates.bio }),
      ...(updates.username !== undefined && { username: updates.username }),
      ...(updates.coverUrl !== undefined && { cover_url: updates.coverUrl }),
      ...(updates.pronouns !== undefined && { pronouns: updates.pronouns }),
      ...(updates.website !== undefined && { website: updates.website }),
      ...(updates.location !== undefined && { location: updates.location }),
      ...(updates.work !== undefined && { work: updates.work }),
      ...(updates.education !== undefined && { education: updates.education }),
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
  
  // Clean basic pattern matching chars, but encode for PostgREST to prevent injection
  const safeQuery = query.replace(/[%_\\]/g, '');
  if (safeQuery.length < 2) return { users: [] };

  const encodedQuery = encodeURIComponent(safeQuery);

  const { data, error } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url')
    .or(`username.ilike.${encodedQuery}%,display_name.ilike.${encodedQuery}%`)
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
    .select('last_seen, read_receipts, profile_photo_visibility, message_privacy, post_privacy, tag_privacy, connections_visibility, off_platform_activity')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') throw new Error(error.message);

  return {
    lastSeen: data?.last_seen || 'everyone',
    readReceipts: data?.read_receipts ?? true,
    profilePhotoVisibility: data?.profile_photo_visibility || 'everyone',
    messagePrivacy: data?.message_privacy || 'everyone',
    postPrivacy: data?.post_privacy || 'everyone',
    tagPrivacy: data?.tag_privacy || 'everyone',
    connectionsVisibility: data?.connections_visibility || 'everyone',
    offPlatformActivity: data?.off_platform_activity ?? false,
  };
}

export async function updatePrivacySettings(updates: {
  lastSeen?: string;
  readReceipts?: boolean;
  profilePhotoVisibility?: string;
  messagePrivacy?: string;
  postPrivacy?: string;
  tagPrivacy?: string;
  connectionsVisibility?: string;
  offPlatformActivity?: boolean;
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
      ...(updates.messagePrivacy !== undefined && { message_privacy: updates.messagePrivacy }),
      ...(updates.postPrivacy !== undefined && { post_privacy: updates.postPrivacy }),
      ...(updates.tagPrivacy !== undefined && { tag_privacy: updates.tagPrivacy }),
      ...(updates.connectionsVisibility !== undefined && { connections_visibility: updates.connectionsVisibility }),
      ...(updates.offPlatformActivity !== undefined && { off_platform_activity: updates.offPlatformActivity }),
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
    .limit(1)
    .maybeSingle();
    
  if (ikErr) throw new Error(ikErr.message);
  if (!ik) throw new Error("User has not set up End-to-End Encryption yet.");

  const { data: user } = await supabase
    .from('users')
    .select('registration_id')
    .eq('id', userId)
    .maybeSingle();

  const { data: spk, error: spkErr } = await supabase
    .from('signed_pre_keys')
    .select('key_id, public_key, signature')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
    
  if (spkErr) throw new Error(spkErr.message);
  if (!spk) throw new Error("User's signed pre-keys are missing.");

  const { data: otpk } = await supabase.rpc('fetch_otpk', { target_user_id: userId }).maybeSingle() as any;

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

export async function uploadSignalKeys(userId: string, deviceId: number, payload: {
  registrationId: number;
  identityKey: string;
  signedPreKey: { keyId: number; publicKey: string; signature: string };
  oneTimePreKeys: { keyId: number; publicKey: string }[];
}) {
  await supabase.from('users').update({ registration_id: payload.registrationId }).eq('id', userId);

  await supabase.from('identity_keys').upsert({
    user_id: userId,
    device_id: deviceId,
    identity_key: payload.identityKey
  }, { onConflict: 'user_id,device_id' });

  await supabase.from('signed_pre_keys').upsert({
    user_id: userId,
    device_id: deviceId,
    key_id: payload.signedPreKey.keyId,
    public_key: payload.signedPreKey.publicKey,
    signature: payload.signedPreKey.signature
  }, { onConflict: 'user_id,device_id' });

  const otpkInserts = payload.oneTimePreKeys.map((pk) => ({
    user_id: userId,
    device_id: deviceId,
    key_id: pk.keyId,
    public_key: pk.publicKey
  }));
  await supabase.from('one_time_pre_keys').insert(otpkInserts);
}
