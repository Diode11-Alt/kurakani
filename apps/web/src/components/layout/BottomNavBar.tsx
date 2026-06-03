"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "../../store/authStore";

export function BottomNavBar() {
  const pathname = usePathname();
  const { userId } = useAuthStore();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full glass-dark flex justify-around items-center px-4 py-2 pb-6 z-50 rounded-t-2xl shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.3)]">
      <Link 
        href="/feed"
        className={`flex flex-col items-center justify-center rounded-xl px-4 py-1 active:scale-95 duration-100 ${
          pathname.startsWith("/feed") 
            ? "bg-brand/10 text-brand" 
            : "text-content-muted hover:text-content"
        }`}
      >
        <span className="material-symbols-outlined">dynamic_feed</span>
        <span className="text-[10px] font-bold mt-0.5">Feed</span>
      </Link>

      <Link 
        href="/explore"
        className={`flex flex-col items-center justify-center rounded-xl px-4 py-1 active:scale-95 duration-100 ${
          pathname.startsWith("/explore") 
            ? "bg-brand/10 text-brand" 
            : "text-content-muted hover:text-content"
        }`}
      >
        <span className="material-symbols-outlined">explore</span>
        <span className="text-[10px] font-bold mt-0.5">Explore</span>
      </Link>

      <div className="relative -top-5">
        <Link 
          href="/create"
          className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-700 text-white rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform duration-200 border-4 border-[#1C1816] ember-glow"
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
            ? "bg-brand/10 text-brand" 
            : "text-content-muted hover:text-content"
        }`}
      >
        <span className="material-symbols-outlined">chat</span>
        <span className="text-[10px] font-bold mt-0.5">Messages</span>
        {/* Unread indicator */}
        <span className="absolute top-1 right-3 w-2.5 h-2.5 bg-blaze rounded-full border-2 border-[#1C1816]"></span>
      </Link>

      <Link 
        href={`/profile/${userId || 'me'}`}
        className={`flex flex-col items-center justify-center rounded-xl px-4 py-1 active:scale-95 duration-100 ${
          pathname.startsWith("/profile") 
            ? "bg-brand/10 text-brand" 
            : "text-content-muted hover:text-content"
        }`}
      >
        <span className="material-symbols-outlined">person</span>
        <span className="text-[10px] font-bold mt-0.5">Profile</span>
      </Link>
    </nav>
  );
}
