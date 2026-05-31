"use client";

import { useState, useEffect } from 'react';
import { 
  User, Shield, Bell, Smartphone, Trash2, LogOut,
  ChevronRight, Eye, EyeOff, Check, X, Loader2, Save
} from 'lucide-react';

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<string>('profile');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Profile state
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [username, setUsername] = useState('');

  // Privacy state
  const [lastSeen, setLastSeen] = useState('everyone');
  const [readReceipts, setReadReceipts] = useState(true);
  const [profilePhoto, setProfilePhoto] = useState('everyone');

  // Notification state
  const [pushEnabled, setPushEnabled] = useState(true);
  const [previewEnabled, setPreviewEnabled] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

      const [profileRes, privacyRes, notifRes] = await Promise.all([
        fetch(`${apiBase}/users/me`, { headers }),
        fetch(`${apiBase}/settings/privacy`, { headers }),
        fetch(`${apiBase}/settings/notifications`, { headers }),
      ]);

      if (profileRes.ok) {
        const p = await profileRes.json();
        setDisplayName(p.displayName || '');
        setBio(p.bio || '');
        setUsername(p.username || '');
      }
      if (privacyRes.ok) {
        const pr = await privacyRes.json();
        setLastSeen(pr.lastSeen);
        setReadReceipts(pr.readReceipts);
        setProfilePhoto(pr.profilePhotoVisibility);
      }
      if (notifRes.ok) {
        const n = await notifRes.json();
        setPushEnabled(n.pushNotifications);
        setPreviewEnabled(n.notificationPreview);
      }
    } catch {}
  }

  async function saveSettings(section: string) {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

      if (section === 'profile') {
        await fetch(`${apiBase}/users/me`, {
          method: 'PUT', headers,
          body: JSON.stringify({ displayName, bio, username }),
        });
      } else if (section === 'privacy') {
        await fetch(`${apiBase}/settings/privacy`, {
          method: 'PUT', headers,
          body: JSON.stringify({ lastSeen, readReceipts, profilePhotoVisibility: profilePhoto }),
        });
      } else if (section === 'notifications') {
        await fetch(`${apiBase}/settings/notifications`, {
          method: 'PUT', headers,
          body: JSON.stringify({ pushNotifications: pushEnabled, notificationPreview: previewEnabled }),
        });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {} finally {
      setLoading(false);
    }
  }

  const sections = [
    { id: 'profile', label: 'Profile', icon: User, color: 'text-indigo-500' },
    { id: 'privacy', label: 'Privacy', icon: Shield, color: 'text-emerald-500' },
    { id: 'notifications', label: 'Notifications', icon: Bell, color: 'text-amber-500' },
    { id: 'account', label: 'Account', icon: Smartphone, color: 'text-rose-500' },
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
        <div className="flex-1 card p-6">
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
                <div>
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

                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">Read Receipts</p>
                    <p className="text-xs text-[var(--color-guff-text-muted)]">Let others know when you&apos;ve read their messages</p>
                  </div>
                  <button onClick={() => setReadReceipts(!readReceipts)}
                    className={`w-11 h-6 rounded-full transition-all relative ${readReceipts ? 'bg-[var(--color-guff-primary)]' : 'bg-gray-300'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-all ${readReceipts ? 'left-5.5' : 'left-0.5'}`} />
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
                    className={`w-11 h-6 rounded-full transition-all relative ${pushEnabled ? 'bg-[var(--color-guff-primary)]' : 'bg-gray-300'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-all ${pushEnabled ? 'left-5.5' : 'left-0.5'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">Message Preview</p>
                    <p className="text-xs text-[var(--color-guff-text-muted)]">Show message content in notifications</p>
                  </div>
                  <button onClick={() => setPreviewEnabled(!previewEnabled)}
                    className={`w-11 h-6 rounded-full transition-all relative ${previewEnabled ? 'bg-[var(--color-guff-primary)]' : 'bg-gray-300'}`}>
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
                <button className="w-full flex items-center justify-between p-4 rounded-xl border border-[var(--color-guff-border)] hover:bg-[var(--color-guff-bg)] transition-all">
                  <div className="flex items-center gap-3">
                    <LogOut className="w-5 h-5 text-[var(--color-guff-text-secondary)]" />
                    <span className="text-sm font-medium">Log Out</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--color-guff-text-muted)]" />
                </button>

                <button className="w-full flex items-center justify-between p-4 rounded-xl border border-red-200 hover:bg-red-50 transition-all group">
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-5 h-5 text-red-400 group-hover:text-red-500" />
                    <div className="text-left">
                      <span className="text-sm font-medium text-red-500">Delete Account</span>
                      <p className="text-xs text-[var(--color-guff-text-muted)]">Your data will be deleted after 30 days</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-red-300" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
