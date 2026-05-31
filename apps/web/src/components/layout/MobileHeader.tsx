"use client";

import { useAppStore } from "../../store/appStore";

export function MobileHeader() {
  const { user } = useAppStore();

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 h-16 glass bg-surface/80 flex items-center justify-between px-lg z-40 border-b border-outline-variant/30 shadow-sm">
      <span className="font-display-lg text-headline-md font-black text-primary tracking-tight">GUFF</span>
      <div className="flex items-center gap-md">
        <span className="material-symbols-outlined text-on-surface-variant cursor-pointer active:scale-95">
          notifications
        </span>
        <span 
          className="material-symbols-outlined text-primary cursor-pointer active:scale-95" 
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          encrypted
        </span>
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white font-bold overflow-hidden shadow-sm border border-outline-variant/30">
          {user?.name?.[0]?.toUpperCase() || "?"}
        </div>
      </div>
    </header>
  );
}
