"use client";

import { useAuthStore } from "../../store/authStore";
import Link from "next/link";

export function MobileHeader() {
  const { user, userId } = useAuthStore();

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 h-16 glass-dark flex items-center justify-between px-lg z-40 shadow-sm">
      <span className="text-headline-md font-black text-brand tracking-tight">GUFF</span>
      <div className="flex items-center gap-md">
        <span className="material-symbols-outlined text-content-muted hover:text-brand cursor-pointer transition-colors active:scale-95">
          notifications
        </span>
        <span 
          className="material-symbols-outlined text-spark cursor-pointer active:scale-95" 
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          encrypted
        </span>
        <Link href={`/profile/${userId || 'me'}`} className="w-8 h-8 rounded-xl bg-ember-gradient flex items-center justify-center text-white font-bold overflow-hidden ember-glow-sm border border-[#4A3D33] hover:opacity-80 transition-opacity">
          {user?.name?.[0]?.toUpperCase() || "?"}
        </Link>
      </div>
    </header>
  );
}
