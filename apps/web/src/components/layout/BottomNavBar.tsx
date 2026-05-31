"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNavBar() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full glass bg-surface/90 border-t border-outline-variant/30 flex justify-around items-center px-4 py-2 pb-6 z-50 rounded-t-xl shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)]">
      <Link 
        href="/feed"
        className={`flex flex-col items-center justify-center rounded-xl px-4 py-1 active:scale-95 duration-100 ${
          pathname.startsWith("/feed") 
            ? "bg-primary-container text-on-primary-container" 
            : "text-on-surface-variant"
        }`}
      >
        <span className="material-symbols-outlined">dynamic_feed</span>
        <span className="text-[10px] font-bold mt-0.5">Feed</span>
      </Link>

      <Link 
        href="/explore"
        className={`flex flex-col items-center justify-center rounded-xl px-4 py-1 active:scale-95 duration-100 ${
          pathname.startsWith("/explore") 
            ? "bg-primary-container text-on-primary-container" 
            : "text-on-surface-variant"
        }`}
      >
        <span className="material-symbols-outlined">explore</span>
        <span className="text-[10px] font-bold mt-0.5">Explore</span>
      </Link>

      {/* Large elevated '+' button in center */}
      <div className="relative -top-4">
        <Link 
          href="/create"
          className="w-14 h-14 bg-primary text-white rounded-2xl shadow-xl flex items-center justify-center active:scale-90 transition-transform duration-200"
        >
          <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'wght' 700" }}>
            add
          </span>
        </Link>
      </div>

      <Link 
        href="/messages"
        className={`flex flex-col items-center justify-center rounded-xl px-4 py-1 relative active:scale-95 duration-100 ${
          pathname.startsWith("/messages") 
            ? "bg-primary-container text-on-primary-container" 
            : "text-on-surface-variant"
        }`}
      >
        <span className="material-symbols-outlined">chat</span>
        <span className="text-[10px] font-bold mt-0.5">Messages</span>
        {/* Unread indicator */}
        <span className="absolute top-1 right-3 w-2 h-2 bg-error rounded-full border border-white"></span>
      </Link>

      <Link 
        href="/profile"
        className={`flex flex-col items-center justify-center rounded-xl px-4 py-1 active:scale-95 duration-100 ${
          pathname.startsWith("/profile") 
            ? "bg-primary-container text-on-primary-container" 
            : "text-on-surface-variant"
        }`}
      >
        <span className="material-symbols-outlined">person</span>
        <span className="text-[10px] font-bold mt-0.5">Profile</span>
      </Link>
    </nav>
  );
}
