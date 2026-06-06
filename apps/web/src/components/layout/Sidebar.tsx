"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "../../store/authStore";
import { useUIStore } from "../../store/uiStore";
import { supabase } from "../../lib/supabase";
import { NotificationSidebar } from "./NotificationSidebar";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userId, clearAuth } = useAuthStore();
  const { isNotificationsOpen, setIsNotificationsOpen } = useUIStore();

  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const fetchUnread = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('is_read', false);
      if (data) setUnreadNotifications(data.length);
    };

    fetchUnread();

    const channel = supabase
      .channel('public:notifications:badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  const navItems = [
    { icon: "dynamic_feed", label: "Feed", href: "/feed" },
    { icon: "explore", label: "Explore", href: "/explore" },
    { icon: "notifications", label: "Notifications", action: () => setIsNotificationsOpen(!isNotificationsOpen), badge: unreadNotifications },
    { icon: "add_box", label: "Create", href: "/create" },
    { icon: "chat", label: "Messages", href: "/messages", badge: 0 },
    { icon: "group", label: "Connections", href: "/connections" },
    { icon: "person", label: "Profile", href: `/profile/${userId || 'me'}` },
  ];

  return (
    <>
      <aside className="hidden md:flex sidebar-transition flex-col h-screen w-64 fixed left-0 top-0 bg-[var(--color-surface)] z-[70] pt-8 pb-6 px-4 shadow-sm border-r border-[var(--color-outline-variant)]/50">
        {/* Logo Header */}
        <div className="flex items-center gap-3 mb-10 px-4 cursor-pointer group">
          <img src="/favicon.ico" alt="Kurakani Logo" className="w-8 h-8 object-contain" />
          <span className="font-display-lg text-[32px] leading-tight font-black text-[var(--color-primary)]">Kurakani</span>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const isActive = item.href ? pathname.startsWith(item.href) : (item.label === 'Notifications' && isNotificationsOpen);
            
            const content = (
              <>
                <div className="flex items-center gap-3 z-10 relative">
                  <span className={`material-symbols-outlined transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>

                {item.badge ? (
                  <span className="bg-[var(--color-error)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10 relative">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                ) : null}
              </>
            );

            const className = `flex items-center justify-between px-4 py-3 rounded-xl transition-colors relative group active:scale-[0.98] duration-200 overflow-hidden ${
              isActive
                ? "text-[var(--color-primary)] font-bold border-r-4 border-[var(--color-primary)] bg-[var(--color-surface-container-low)]"
                : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] font-body-lg"
            }`;

            if (item.action) {
              return (
                <button key={item.label} onClick={item.action} className={`w-full text-left ${className}`}>
                  {content}
                </button>
              );
            }

            return (
              <Link key={item.label} href={item.href!} className={className}>
                {content}
              </Link>
            );
          })}
        </nav>

      {/* Bottom Section (Settings & User) */}
      <div className="mt-auto space-y-2">
        <button className="w-full bg-[var(--color-primary)] text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] duration-150 shadow-sm transition-all hover:opacity-90">
          <span className="material-symbols-outlined">add</span>
          New Message
        </button>

        <div className="pt-4 border-t border-[var(--color-outline-variant)] space-y-1 mt-4">
          <Link
            href="/settings"
            className="flex items-center gap-3 px-4 py-2 rounded-xl text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] transition-colors text-body-md"
          >
            <span className="material-symbols-outlined">settings</span>
            Settings
          </Link>
          <Link
            href="/support"
            className="flex items-center gap-3 px-4 py-2 rounded-xl text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] transition-colors text-body-md"
          >
            <span className="material-symbols-outlined">help</span>
            Support
          </Link>

          {/* User Card */}
          <div className="mt-4 p-3 flex items-center gap-3 hover:bg-[var(--color-surface-container)] rounded-2xl transition-colors group cursor-pointer border border-transparent hover:border-[var(--color-outline-variant)]/50">
            <div className="w-10 h-10 rounded-full bg-[var(--color-primary-container)] flex items-center justify-center text-white font-bold shadow-inner relative overflow-hidden">
              {user?.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[var(--color-on-surface)] truncate">{user?.name || "Verified Identity"}</p>
              <p className="text-[11px] text-[var(--color-on-surface-variant)] truncate font-mono tracking-tight">{user?.phone || "E2EE Active"}</p>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }} 
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-on-surface-variant)] hover:bg-[var(--color-error)]/10 hover:text-[var(--color-error)] transition-colors"
              title="Disconnect"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </div>
    </aside>

      <NotificationSidebar 
        userId={userId!} 
        isOpen={isNotificationsOpen} 
        onClose={() => setIsNotificationsOpen(false)} 
      />
    </>
  );
}
