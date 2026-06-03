"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "../../store/authStore";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userId, clearAuth } = useAuthStore();

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  const navItems = [
    { icon: "dynamic_feed", label: "Feed", href: "/feed" },
    { icon: "explore", label: "Explore", href: "/explore" },
    { icon: "add_box", label: "Create", href: "/create" },
    { icon: "chat", label: "Messages", href: "/messages", badge: 0 },
    { icon: "person", label: "Profile", href: `/profile/${userId || 'me'}` },
  ];

  return (
    <aside className="hidden md:flex sidebar-transition flex-col h-screen w-64 fixed left-0 top-0 bg-[var(--color-surface)] z-50 pt-8 pb-6 px-4 shadow-sm border-r border-[var(--color-outline-variant)]/50">
      {/* Logo Header */}
      <div className="flex items-center gap-3 mb-10 px-4 cursor-pointer group">
        <span className="font-display-lg text-[32px] leading-tight font-black text-[var(--color-primary)]">GUFF</span>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center justify-between px-4 py-3 rounded-xl transition-colors relative group active:scale-[0.98] duration-200 overflow-hidden ${
                isActive
                  ? "text-[var(--color-primary)] font-bold border-r-4 border-[var(--color-primary)] bg-[var(--color-surface-container-low)]"
                  : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] font-body-lg"
              }`}
            >
              <div className="flex items-center gap-3 z-10 relative">
                <span className={`material-symbols-outlined transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>

              {item.badge ? (
                <span className="bg-[var(--color-primary)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10 relative">
                  {item.badge}
                </span>
              ) : null}
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
  );
}
