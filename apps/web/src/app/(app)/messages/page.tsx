"use client";

import { MessageSquare, Lock, ShieldCheck } from 'lucide-react';

export default function MessagesIndexPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[var(--color-guff-surface-bright)] relative overflow-hidden h-full">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-[var(--color-guff-primary)]/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-[var(--color-guff-secondary)]/5 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="text-center max-w-sm px-6 z-10 flex flex-col items-center">
        {/* SVG lock illustration container */}
        <div className="w-32 h-32 bg-[var(--color-guff-primary-light)]/40 rounded-full flex items-center justify-center mb-6 relative">
          <MessageSquare className="w-16 h-16 text-[var(--color-guff-primary)] animate-pulse" />
          <div className="absolute -top-1 -right-1 bg-[var(--color-guff-secondary-container)] w-10 h-10 rounded-full flex items-center justify-center shadow-lg text-white">
            <Lock className="w-5 h-5" />
          </div>
        </div>

        <h2 className="text-2xl font-extrabold text-[var(--color-guff-text)] mb-3">No chat selected</h2>
        <p className="text-sm text-[var(--color-guff-text-secondary)] mb-8 leading-relaxed">
          Pick a conversation from the left to start messaging securely or start a fresh thread with your team.
        </p>
        
        {/* Status indicator bar */}
        <div className="flex items-center justify-center gap-1.5 text-[var(--color-guff-text-muted)] border-t border-[var(--color-guff-border)]/20 pt-6 w-full select-none">
          <ShieldCheck className="w-4 h-4 text-[var(--color-guff-success)]" />
          <span className="text-[10px] font-bold uppercase tracking-widest">End-to-End Encrypted Architecture</span>
        </div>
      </div>
    </div>
  );
}
