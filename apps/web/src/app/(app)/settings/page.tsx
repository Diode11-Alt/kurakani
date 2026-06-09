"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  User, Shield, Bell, Smartphone, Trash2, LogOut,
  ChevronRight, Check, Loader2, Save, Camera, Image as ImageIcon, X
} from 'lucide-react';
import {
  getProfile, updateProfile, uploadAvatar, uploadCover,
  getPrivacySettings, updatePrivacySettings,
  getNotificationSettings, updateNotificationSettings,
  logout, deleteAccount
} from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';

export default function SettingsPage() {
  const router = useRouter();
  const { clearAuth } = useAuthStore();
  const [activeSection, setActiveSection] = useState<string>('profile');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Profile state
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [username, setUsername] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');
  const [work, setWork] = useState('');
  const [education, setEducation] = useState('');

  // Avatar / Cover
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState('');
  const [currentCoverUrl, setCurrentCoverUrl] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Privacy state
  const [isPublic, setIsPublic] = useState(true);
  const [requireConnectionRequests, setRequireConnectionRequests] = useState(false);
  const [lastSeen, setLastSeen] = useState('everyone');
  const [readReceipts, setReadReceipts] = useState(true);
  const [profilePhoto, setProfilePhoto] = useState('everyone');
  const [messagePrivacy, setMessagePrivacy] = useState('everyone');
  const [postPrivacy, setPostPrivacy] = useState('everyone');
  const [tagPrivacy, setTagPrivacy] = useState('everyone');
  const [connectionsVisibility, setConnectionsVisibility] = useState('everyone');
  const [offPlatformActivity, setOffPlatformActivity] = useState(false);

  // Notification state
  const [pushEnabled, setPushEnabled] = useState(true);
  const [previewEnabled, setPreviewEnabled] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const [profileRes, privacyRes, notifRes] = await Promise.all([
        getProfile().catch(() => null),
        getPrivacySettings().catch(() => null),
        getNotificationSettings().catch(() => null),
      ]);

      if (profileRes) {
        setDisplayName(profileRes.displayName || '');
        setBio(profileRes.bio || '');
        setUsername(profileRes.username || '');
        setPronouns((profileRes as any).pronouns || '');
        setWebsite((profileRes as any).website || '');
        setLocation((profileRes as any).location || '');
        setWork((profileRes as any).work || '');
        setEducation((profileRes as any).education || '');
        setIsPublic((profileRes as any).isPublic ?? true);
        setRequireConnectionRequests((profileRes as any).requireConnectionRequests ?? false);
        setCurrentAvatarUrl(profileRes.avatarUrl || '');
        setCurrentCoverUrl((profileRes as any).coverUrl || '');
      }
      if (privacyRes) {
        setLastSeen(privacyRes.lastSeen || 'everyone');
        setReadReceipts(privacyRes.readReceipts ?? true);
        setProfilePhoto(privacyRes.profilePhotoVisibility || 'everyone');
        setMessagePrivacy((privacyRes as any).messagePrivacy || 'everyone');
        setPostPrivacy((privacyRes as any).postPrivacy || 'everyone');
        setTagPrivacy((privacyRes as any).tagPrivacy || 'everyone');
        setConnectionsVisibility((privacyRes as any).connectionsVisibility || 'everyone');
        setOffPlatformActivity((privacyRes as any).offPlatformActivity ?? false);
      }
      if (notifRes) {
        setPushEnabled(notifRes.pushNotifications ?? true);
        setPreviewEnabled(notifRes.notificationPreview ?? false);
      }
    } catch (err) {
      console.error("Failed to load settings", err);
    }
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  async function handleUploadAvatar() {
    if (!avatarFile) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadAvatar(avatarFile);
      await updateProfile({ avatarUrl: url });
      setCurrentAvatarUrl(url);
      setAvatarPreview(null);
      setAvatarFile(null);
      toast.success('Profile picture updated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleUploadCover() {
    if (!coverFile) return;
    setUploadingCover(true);
    try {
      const url = await uploadCover(coverFile);
      await updateProfile({ coverUrl: url });
      setCurrentCoverUrl(url);
      setCoverPreview(null);
      setCoverFile(null);
      toast.success('Cover image updated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload cover');
    } finally {
      setUploadingCover(false);
    }
  }

  async function saveSettings(section: string) {
    setLoading(true);
    try {
      if (section === 'profile') {
        await updateProfile({ displayName, bio, username, pronouns, website, location, work, education } as any);
      } else if (section === 'privacy') {
        await updateProfile({ isPublic, requireConnectionRequests } as any);
        await updatePrivacySettings({ 
          lastSeen, 
          readReceipts, 
          profilePhotoVisibility: profilePhoto,
          messagePrivacy,
          postPrivacy,
          tagPrivacy,
          connectionsVisibility,
          offPlatformActivity
        } as any);
      } else if (section === 'notifications') {
        await updateNotificationSettings({ pushNotifications: pushEnabled, notificationPreview: previewEnabled });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      console.error("Failed to save settings", err);
      toast.error(err.message || "Failed to save changes. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      setLoading(true);
      await logout();
      clearAuth();
      router.push('/login');
    } catch (err) {
      console.error("Logout failed", err);
      toast.error("Failed to log out.");
      setLoading(false);
    }
  }

  async function handleDeleteAccount() {
    if (confirm("Are you sure you want to delete your account? This action cannot be undone and your data will be permanently deleted.")) {
      try {
        setLoading(true);
        await deleteAccount();
        clearAuth();
        router.push('/login');
      } catch (err) {
        console.error("Delete account failed", err);
        toast.error("Failed to delete account. Please try again.");
        setLoading(false);
      }
    }
  }

  const sections = [
    { id: 'profile', label: 'Profile', icon: User, color: 'text-brand' },
    { id: 'privacy', label: 'Privacy', icon: Shield, color: 'text-spark' },
    { id: 'notifications', label: 'Notifications', icon: Bell, color: 'text-brand' },
    { id: 'account', label: 'Account', icon: Smartphone, color: 'text-blaze' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-56 shrink-0 hidden md:block">
          <nav className="space-y-1">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeSection === s.id
                    ? 'bg-[var(--color-guff-primary-light)] text-[var(--color-guff-primary)]'
                    : 'text-[var(--color-guff-text-secondary)] hover:bg-[var(--color-guff-bg)]'
                }`}
              >
                <s.icon className={`w-4.5 h-4.5 ${activeSection === s.id ? 'text-[var(--color-guff-primary)]' : s.color}`} />
                {s.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 card-ember p-6">
          {/* Profile Section */}
          {activeSection === 'profile' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-1">Profile</h2>
                <p className="text-sm text-[var(--color-guff-text-muted)]">Manage your public profile information</p>
              </div>

              {/* Cover photo */}
              <div>
                <label className="block text-xs font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-2">Cover Photo</label>
                <div className="relative h-32 rounded-xl overflow-hidden bg-gradient-to-br from-[var(--color-surface-container)] to-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)]/40">
                  {(coverPreview || currentCoverUrl) && (
                    <img src={coverPreview || currentCoverUrl} alt="Cover" className="w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center gap-2">
                    <button onClick={() => coverInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-black/50 hover:bg-black/70 text-white text-xs font-semibold rounded-lg transition-all">
                      <ImageIcon className="w-3.5 h-3.5" />
                      {currentCoverUrl ? 'Change Cover' : 'Add Cover'}
                    </button>
                    {coverPreview && (
                      <button onClick={handleUploadCover} disabled={uploadingCover}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-60">
                        {uploadingCover ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Save
                      </button>
                    )}
                  </div>
                  {coverPreview && (
                    <button onClick={() => { setCoverPreview(null); setCoverFile(null); }}
                      className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleCoverChange} />
              </div>

              {/* Avatar */}
              <div>
                <label className="block text-xs font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-2">Profile Picture</label>
                <div className="flex items-center gap-5">
                  <div className="relative flex-shrink-0">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-[var(--color-primary-container)] flex items-center justify-center border-2 border-[var(--color-outline-variant)]">
                      {(avatarPreview || currentAvatarUrl) ? (
                        <img src={avatarPreview || currentAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-bold text-[var(--color-primary)]">{username?.[0]?.toUpperCase() || '?'}</span>
                      )}
                    </div>
                    <button onClick={() => avatarInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center shadow-md hover:bg-[var(--color-primary)]/90 transition-all">
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium">{avatarPreview ? 'New photo selected' : 'Upload a photo'}</p>
                    <p className="text-xs text-[var(--color-on-surface-variant)]">JPG, PNG, GIF, or WEBP · max 5 MB</p>
                    <div className="flex gap-2">
                      <button onClick={() => avatarInputRef.current?.click()}
                        className="px-3 py-1.5 text-xs font-semibold border border-[var(--color-outline-variant)] rounded-lg hover:bg-[var(--color-surface-container)] transition-all">
                        Choose Photo
                      </button>
                      {avatarPreview && (
                        <>
                          <button onClick={handleUploadAvatar} disabled={uploadingAvatar}
                            className="px-3 py-1.5 text-xs font-semibold bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 transition-all disabled:opacity-60 flex items-center gap-1">
                            {uploadingAvatar ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            Upload
                          </button>
                          <button onClick={() => { setAvatarPreview(null); setAvatarFile(null); }}
                            className="px-3 py-1.5 text-xs font-semibold text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] rounded-lg transition-all">
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleAvatarChange} />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Username</label>
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                    className="input-field" placeholder="your_username" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Display Name</label>
                  <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
                    className="input-field" placeholder="Your Name" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Bio</label>
                  <textarea value={bio} onChange={e => setBio(e.target.value)}
                    className="input-field resize-none" rows={3} placeholder="Tell others about yourself..." maxLength={500} />
                  <p className="text-xs text-[var(--color-guff-text-muted)] mt-1">{bio.length}/500</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Pronouns</label>
                  <input type="text" value={pronouns} onChange={e => setPronouns(e.target.value)}
                    className="input-field" placeholder="they/them" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Website</label>
                  <input type="url" value={website} onChange={e => setWebsite(e.target.value)}
                    className="input-field" placeholder="https://example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Location</label>
                  <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                    className="input-field" placeholder="City, Country" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Work</label>
                  <input type="text" value={work} onChange={e => setWork(e.target.value)}
                    className="input-field" placeholder="Company / Job Title" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Education</label>
                  <input type="text" value={education} onChange={e => setEducation(e.target.value)}
                    className="input-field" placeholder="University / School" />
                </div>
              </div>

              <button onClick={() => saveSettings('profile')} disabled={loading}
                className="btn-primary flex items-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saved ? 'Saved!' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* Privacy Section */}
          {activeSection === 'privacy' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-1">Privacy</h2>
                <p className="text-sm text-[var(--color-guff-text-muted)]">Control who can see your information</p>
              </div>

              <div className="space-y-5">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">Public Account</p>
                    <p className="text-xs text-[var(--color-guff-text-muted)]">Allow anyone to find your profile in search</p>
                  </div>
                  <button onClick={() => setIsPublic(!isPublic)}
                    className={`w-11 h-6 rounded-full transition-all relative ${isPublic ? 'bg-brand' : 'bg-[#4A3D33]'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-all ${isPublic ? 'left-5.5' : 'left-0.5'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">Require Connection Requests</p>
                    <p className="text-xs text-[var(--color-guff-text-muted)]">Users must send a request to view your full profile and message you</p>
                  </div>
                  <button onClick={() => setRequireConnectionRequests(!requireConnectionRequests)}
                    className={`w-11 h-6 rounded-full transition-all relative ${requireConnectionRequests ? 'bg-brand' : 'bg-[#4A3D33]'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-all ${requireConnectionRequests ? 'left-5.5' : 'left-0.5'}`} />
                  </button>
                </div>

                <div className="border-t border-[var(--color-guff-border)] pt-5">
                  <label className="block text-sm font-medium mb-2">Last Seen</label>
                  <select value={lastSeen} onChange={e => setLastSeen(e.target.value)}
                    className="input-field">
                    <option value="everyone">Everyone</option>
                    <option value="contacts">My contacts</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Profile Photo</label>
                  <select value={profilePhoto} onChange={e => setProfilePhoto(e.target.value)}
                    className="input-field">
                    <option value="everyone">Everyone</option>
                    <option value="contacts">My contacts</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Message Privacy</label>
                  <select value={messagePrivacy} onChange={e => setMessagePrivacy(e.target.value)}
                    className="input-field">
                    <option value="everyone">Everyone</option>
                    <option value="contacts">My contacts</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Post Privacy</label>
                  <select value={postPrivacy} onChange={e => setPostPrivacy(e.target.value)}
                    className="input-field">
                    <option value="everyone">Everyone</option>
                    <option value="contacts">My contacts</option>
                    <option value="only_me">Only Me</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Tag Privacy</label>
                  <select value={tagPrivacy} onChange={e => setTagPrivacy(e.target.value)}
                    className="input-field">
                    <option value="everyone">Everyone</option>
                    <option value="contacts">My contacts</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Connections Visibility</label>
                  <select value={connectionsVisibility} onChange={e => setConnectionsVisibility(e.target.value)}
                    className="input-field">
                    <option value="everyone">Everyone</option>
                    <option value="contacts">My contacts</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">Read Receipts</p>
                    <p className="text-xs text-[var(--color-guff-text-muted)]">Let others know when you&apos;ve read their messages</p>
                  </div>
                  <button onClick={() => setReadReceipts(!readReceipts)}
                    className={`w-11 h-6 rounded-full transition-all relative ${readReceipts ? 'bg-brand' : 'bg-[#4A3D33]'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-all ${readReceipts ? 'left-5.5' : 'left-0.5'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">Off-Platform Activity Tracker</p>
                    <p className="text-xs text-[var(--color-guff-text-muted)]">Allow tracking link clicks for recommendations</p>
                  </div>
                  <button onClick={() => setOffPlatformActivity(!offPlatformActivity)}
                    className={`w-11 h-6 rounded-full transition-all relative ${offPlatformActivity ? 'bg-brand' : 'bg-[#4A3D33]'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-all ${offPlatformActivity ? 'left-5.5' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>

              <button onClick={() => saveSettings('privacy')} disabled={loading}
                className="btn-primary flex items-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saved ? 'Saved!' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* Notifications Section */}
          {activeSection === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-1">Notifications</h2>
                <p className="text-sm text-[var(--color-guff-text-muted)]">Configure how you receive notifications</p>
              </div>

              <div className="space-y-5">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">Push Notifications</p>
                    <p className="text-xs text-[var(--color-guff-text-muted)]">Receive notifications when the app is in the background</p>
                  </div>
                  <button onClick={() => setPushEnabled(!pushEnabled)}
                    className={`w-11 h-6 rounded-full transition-all relative ${pushEnabled ? 'bg-brand' : 'bg-[#4A3D33]'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-all ${pushEnabled ? 'left-5.5' : 'left-0.5'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">Message Preview</p>
                    <p className="text-xs text-[var(--color-guff-text-muted)]">Show message content in notifications</p>
                  </div>
                  <button onClick={() => setPreviewEnabled(!previewEnabled)}
                    className={`w-11 h-6 rounded-full transition-all relative ${previewEnabled ? 'bg-brand' : 'bg-[#4A3D33]'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-all ${previewEnabled ? 'left-5.5' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>

              <button onClick={() => saveSettings('notifications')} disabled={loading}
                className="btn-primary flex items-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saved ? 'Saved!' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* Account Section */}
          {activeSection === 'account' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-1">Account</h2>
                <p className="text-sm text-[var(--color-guff-text-muted)]">Manage your account and data</p>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={handleLogout}
                  disabled={loading}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-[var(--color-guff-border)] hover:bg-[var(--color-guff-bg)] transition-all cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <LogOut className="w-5 h-5 text-[var(--color-guff-text-secondary)]" />
                    <span className="text-sm font-medium">Log Out</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--color-guff-text-muted)]" />
                </button>

                <button 
                  onClick={handleDeleteAccount}
                  disabled={loading}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-blaze/30 hover:bg-blaze/10 transition-all group cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-5 h-5 text-blaze group-hover:text-blaze" />
                    <div className="text-left">
                      <span className="text-sm font-medium text-blaze">Delete Account</span>
                      <p className="text-xs text-[var(--color-guff-text-muted)]">Your data will be permanently deleted</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-blaze/50" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
