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
    <aside className="hidden md:flex sidebar-transition flex-col h-screen w-[280px] fixed left-0 top-0 bg-[#171311] z-50 py-6 px-4 overflow-hidden border-r border-[#4A3D33]/60 shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
      {/* Logo Header */}
      <div className="flex items-center gap-3 mb-10 px-2 cursor-pointer group">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand to-blaze flex items-center justify-center text-white ember-glow-sm shadow-md transition-transform group-hover:scale-105 group-active:scale-95">
          <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            security
          </span>
        </div>
        <span className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-content to-content-muted">
          GUFF
        </span>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1.5">
        <div className="text-[10px] font-bold text-content-muted/50 uppercase tracking-wider mb-3 px-3">Menu</div>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center justify-between px-3 py-3 rounded-xl transition-all relative group active:scale-[0.98] duration-200 overflow-hidden ${
                isActive
                  ? "text-brand font-semibold bg-brand/10"
                  : "text-content-secondary hover:bg-[#262220] hover:text-content"
              }`}
            >
              {/* Active Indicator Line */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-brand rounded-r-full shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
              )}
              
              <div className="flex items-center gap-3 z-10 relative">
                <span className={`material-symbols-outlined text-[22px] transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                  {item.icon}
                </span>
                <span className="text-sm">{item.label}</span>
              </div>

              {item.badge ? (
                <span className="bg-brand text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10 relative">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section (Settings & User) */}
      <div className="pt-4 mt-auto space-y-1.5 relative">
        <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#4A3D33] to-transparent opacity-50" />
        
        <div className="text-[10px] font-bold text-content-muted/50 uppercase tracking-wider mb-3 px-3 mt-4">System</div>
        
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-content-secondary hover:bg-[#262220] hover:text-content transition-all active:scale-[0.98] duration-200 group"
        >
          <span className="material-symbols-outlined text-[20px] group-hover:rotate-45 transition-transform duration-300">settings</span>
          <span className="text-sm font-medium">Settings</span>
        </Link>
        <Link
          href="/support"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-content-secondary hover:bg-[#262220] hover:text-content transition-all active:scale-[0.98] duration-200 group"
        >
          <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform duration-300">help</span>
          <span className="text-sm font-medium">Support</span>
        </Link>

        {/* User Card */}
        <div className="mt-6 p-3 flex items-center gap-3 bg-[#262220]/50 hover:bg-[#262220] rounded-2xl border border-[#4A3D33]/40 transition-colors group cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-[#1C1816] flex items-center justify-center text-brand font-bold shadow-inner border border-brand/20 relative overflow-hidden">
            {user?.name?.[0]?.toUpperCase() || "?"}
            <div className="absolute inset-0 bg-brand/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-content truncate">{user?.name || "Verified Identity"}</p>
            <p className="text-[11px] text-content-muted truncate font-mono tracking-tight">{user?.phone || "E2EE Active"}</p>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleLogout();
            }} 
            className="w-8 h-8 rounded-full flex items-center justify-center text-content-muted hover:bg-blaze/10 hover:text-blaze transition-colors"
            title="Disconnect"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
