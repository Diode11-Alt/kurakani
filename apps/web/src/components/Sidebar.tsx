"use client";

import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { Home, Search, MessageCircle, User, LogOut, PlusSquare } from 'lucide-react';

const NAV_ITEMS = [
  { icon: Home, label: 'Feed', path: '/feed' },
  { icon: Search, label: 'Explore', path: '/explore' },
  { icon: PlusSquare, label: 'Create', path: '/create' },
  { icon: MessageCircle, label: 'Messages', path: '/messages' },
];

export function Sidebar({ profile }: { profile: any }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  return (
    <aside className="hidden md:flex w-[72px] lg:w-[240px] h-screen border-r border-[var(--color-guff-border)] bg-[var(--color-guff-surface)] flex-col justify-between py-6 px-3 lg:px-4 flex-shrink-0">
      {/* Logo */}
      <div>
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-guff-primary)] to-indigo-400 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-lg tracking-tighter">G</span>
          </div>
          <span className="text-xl font-extrabold tracking-tight text-[var(--color-guff-text)] hidden lg:block">GUFF</span>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {NAV_ITEMS.map(item => {
            const active = pathname === item.path || pathname.startsWith(item.path + '/');
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group
                  ${active
                    ? 'bg-[var(--color-guff-primary-light)] text-[var(--color-guff-primary)]'
                    : 'text-[var(--color-guff-text-secondary)] hover:bg-slate-50 hover:text-[var(--color-guff-text)]'
                  }`}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'stroke-[2.5]' : ''}`} />
                <span className="hidden lg:block">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Profile + Logout */}
      <div className="space-y-2">
        <button
          onClick={() => router.push(`/profile/${profile?.id}`)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--color-guff-text-secondary)] hover:bg-slate-50 hover:text-[var(--color-guff-text)] transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              profile?.username?.[0]?.toUpperCase() || '?'
            )}
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-[var(--color-guff-text)] font-semibold text-sm truncate max-w-[140px]">
              {profile?.display_name || profile?.username || 'User'}
            </div>
            <div className="text-xs text-[var(--color-guff-text-muted)] truncate max-w-[140px]">
              @{profile?.username || 'user'}
            </div>
          </div>
        </button>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--color-guff-text-muted)] hover:bg-red-50 hover:text-[var(--color-guff-danger)] transition-all"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span className="hidden lg:block">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
