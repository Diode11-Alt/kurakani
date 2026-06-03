"use client";

import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { Rss, Compass, PlusSquare, MessageSquare, User, LogOut, Settings, HelpCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const NAV_ITEMS = [
  { icon: Rss, label: 'Feed', path: '/feed' },
  { icon: Compass, label: 'Explore', path: '/explore' },
  { icon: PlusSquare, label: 'Create', path: '/create' },
  { icon: MessageSquare, label: 'Messages', path: '/messages' },
];

export function Sidebar({ profile }: { profile: any }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().clearAuth();
    router.replace('/login');
  };

  return (
    <aside className="hidden md:flex w-[72px] lg:w-[240px] h-screen border-r border-[var(--color-guff-border)] bg-[var(--color-guff-surface)] flex-col justify-between py-6 px-3 lg:px-4 flex-shrink-0 relative z-30">
      {/* Brand Header */}
      <div>
        <div className="flex items-center gap-3 px-2 mb-8 select-none">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-guff-primary)] to-indigo-400 flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-white font-black text-lg tracking-tighter">G</span>
          </div>
          <div className="hidden lg:block leading-none">
            <span className="text-xl font-extrabold tracking-tight text-[var(--color-guff-text)]">GUFF</span>
            <span className="block text-[8px] font-bold text-[var(--color-guff-text-muted)] tracking-wider uppercase mt-0.5">Secure messaging</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {NAV_ITEMS.map(item => {
            const active = pathname === item.path || pathname.startsWith(item.path + '/');
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer
                  ${active
                    ? 'bg-[var(--color-guff-surface-container)] text-[var(--color-guff-primary)] font-bold border-r-4 border-[var(--color-guff-primary)] rounded-r-none'
                    : 'text-[var(--color-guff-text-secondary)] hover:bg-[var(--color-guff-surface-container-low)] hover:text-[var(--color-guff-text)]'
                  }`}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'stroke-[2.5]' : ''}`} />
                <span className="hidden lg:block">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Profile & Settings Footer */}
      <div className="space-y-3 pt-6 border-t border-[var(--color-guff-border)]/40">
        {/* Settings button */}
        <button
          onClick={() => router.push('/settings')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer
            ${pathname === '/settings'
              ? 'bg-[var(--color-guff-surface-container)] text-[var(--color-guff-primary)] font-bold border-r-4 border-[var(--color-guff-primary)] rounded-r-none'
              : 'text-[var(--color-guff-text-secondary)] hover:bg-[var(--color-guff-surface-container-low)] hover:text-[var(--color-guff-text)]'
            }`}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          <span className="hidden lg:block">Settings</span>
        </button>

        {/* Profile Card */}
        <button
          onClick={() => router.push(`/profile/${profile?.id}`)}
          className={`w-full flex items-center gap-3 px-2 py-2 rounded-xl text-sm font-medium text-[var(--color-guff-text-secondary)] hover:bg-[var(--color-guff-surface-container-low)] hover:text-[var(--color-guff-text)] transition-all cursor-pointer border border-transparent
            ${pathname.startsWith(`/profile/${profile?.id}`) ? 'bg-[var(--color-guff-surface-container)] border-[var(--color-guff-border)]/30' : ''}`}
        >
          <div className="w-8 h-8 squircle bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              profile?.username?.[0]?.toUpperCase() || '?'
            )}
          </div>
          <div className="hidden lg:block text-left min-w-0">
            <div className="text-[var(--color-guff-text)] font-semibold text-xs truncate max-w-[130px]">
              {profile?.display_name || profile?.username || 'User'}
            </div>
            <div className="text-[10px] text-[var(--color-guff-text-muted)] truncate max-w-[130px]">
              @{profile?.username || 'user'}
            </div>
          </div>
        </button>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--color-guff-text-muted)] hover:bg-red-50 hover:text-[var(--color-guff-danger)] transition-all cursor-pointer"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span className="hidden lg:block">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
