"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { 
  User, Shield, Bell, Smartphone, Trash2, LogOut,
  ChevronRight, Eye, EyeOff, Check, X, Loader2, Save
} from 'lucide-react';
import { getProfile, updateProfile, getPrivacySettings, updatePrivacySettings, getNotificationSettings, updateNotificationSettings, logout, deleteAccount } from '../../../lib/api';
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
        setPronouns((profileRes as Record<string, unknown>).pronouns as string || '');
        setWebsite((profileRes as Record<string, unknown>).website as string || '');
        setLocation((profileRes as Record<string, unknown>).location as string || '');
        setWork((profileRes as Record<string, unknown>).work as string || '');
        setEducation((profileRes as Record<string, unknown>).education as string || '');
        setIsPublic((profileRes as Record<string, unknown>).isPublic as boolean ?? true);
        setRequireConnectionRequests((profileRes as Record<string, unknown>).requireConnectionRequests as boolean ?? false);
      }
      if (privacyRes) {
        setLastSeen(privacyRes.lastSeen || 'everyone');
        setReadReceipts(privacyRes.readReceipts ?? true);
        setProfilePhoto(privacyRes.profilePhotoVisibility || 'everyone');
        setMessagePrivacy((privacyRes as Record<string, unknown>).messagePrivacy as string || 'everyone');
        setPostPrivacy((privacyRes as Record<string, unknown>).postPrivacy as string || 'everyone');
        setTagPrivacy((privacyRes as Record<string, unknown>).tagPrivacy as string || 'everyone');
        setConnectionsVisibility((privacyRes as Record<string, unknown>).connectionsVisibility as string || 'everyone');
        setOffPlatformActivity((privacyRes as Record<string, unknown>).offPlatformActivity as boolean ?? false);
      }
      if (notifRes) {
        setPushEnabled(notifRes.pushNotifications ?? true);
        setPreviewEnabled(notifRes.notificationPreview ?? false);
      }
    } catch (err) {
      console.error("Failed to load settings", err);
    }
  }

  async function saveSettings(section: string) {
    setLoading(true);
    try {
      if (section === 'profile') {
        await updateProfile({ displayName, bio, username, pronouns, website, location, work, education } as unknown as Parameters<typeof updateProfile>[0]);
      } else if (section === 'privacy') {
        await updateProfile({ isPublic, requireConnectionRequests } as unknown as Parameters<typeof updateProfile>[0]);
        await updatePrivacySettings({ 
          lastSeen, 
          readReceipts, 
          profilePhotoVisibility: profilePhoto,
          messagePrivacy,
          postPrivacy,
          tagPrivacy,
          connectionsVisibility,
          offPlatformActivity
        } as unknown as Parameters<typeof updateProfile>[0]);
      } else if (section === 'notifications') {
        await updateNotificationSettings({ pushNotifications: pushEnabled, notificationPreview: previewEnabled });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: unknown) {
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
