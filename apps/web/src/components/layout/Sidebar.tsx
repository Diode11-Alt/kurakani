"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore } from "../../store/appStore";

export function Sidebar() {
  const pathname = usePathname();
  const { user, userId, setJwt, setUserId } = useAppStore();

  const handleLogout = () => {
    setJwt(null);
    setUserId(null);
    window.location.href = "/login";
  };

  const navItems = [
    { icon: "dynamic_feed", label: "Feed", href: "/feed" },
    { icon: "explore", label: "Explore", href: "/explore" },
    { icon: "add_box", label: "Create", href: "/create" },
    { icon: "chat", label: "Messages", href: "/messages", badge: 0 },
    { icon: "person", label: "Profile", href: `/profile/${userId || 'me'}` },
  ];

  return (
    <aside className="hidden md:flex sidebar-transition flex-col h-screen w-64 fixed left-0 top-0 bg-[#1C1816] shadow-sm z-50 py-md px-md overflow-hidden border-r border-[#4A3D33]">
      <div className="flex items-center gap-md mb-xl px-sm">
        <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center text-brand ember-glow-sm">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            security
          </span>
        </div>
        <span className="font-display-lg text-display-lg font-extrabold text-brand tracking-tight">GUFF</span>
      </div>

      <nav className="flex-1 space-y-base">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center justify-between p-sm rounded-lg transition-all relative group active:scale-[0.98] duration-150 ${
                isActive
                  ? "text-brand font-bold border-l-4 border-brand bg-[#262220] pl-3"
                  : "text-content-muted hover:bg-[#262220] hover:text-content pl-4"
              }`}
            >
              <div className="flex items-center gap-md">
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="whitespace-nowrap">{item.label}</span>
              </div>
              {item.badge ? (
                <span className="bg-brand text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="pt-md mt-auto border-t border-[#4A3D33] space-y-base">
        <Link
          href="/settings"
          className="flex items-center gap-md p-sm rounded-lg text-content-muted hover:bg-[#262220] hover:text-content transition-colors active:scale-[0.98] duration-150"
        >
          <span className="material-symbols-outlined">settings</span>
          <span className="whitespace-nowrap">Settings</span>
        </Link>
        <Link
          href="/support"
          className="flex items-center gap-md p-sm rounded-lg text-content-muted hover:bg-[#262220] hover:text-content transition-colors active:scale-[0.98] duration-150"
        >
          <span className="material-symbols-outlined">help</span>
          <span className="whitespace-nowrap">Support</span>
        </Link>

        <div className="mt-md p-sm flex items-center gap-md bg-[#1C1816] rounded-xl border border-[#4A3D33] shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-ember-gradient flex items-center justify-center text-white font-bold shadow-md ember-glow-sm">
            {user?.name?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-body-md font-bold text-content truncate">{user?.name || "User"}</p>
            <p className="text-label-md text-content-muted truncate text-[10px]">{user?.phone || "Verified User"}</p>
          </div>
          <button onClick={handleLogout} className="text-content-muted hover:text-brand transition-colors">
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
