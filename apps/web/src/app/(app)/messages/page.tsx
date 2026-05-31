"use client";

import { MessageSquare } from 'lucide-react';

export default function MessagesIndexPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 flex items-center justify-center text-indigo-500 mb-4 shadow-sm">
        <MessageSquare className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-[var(--color-guff-text)]">Your Messages</h2>
      <p className="text-sm text-[var(--color-guff-text-muted)] mt-1.5 max-w-sm">
        Select a conversation from the sidebar or search for a user to start a real-time conversation.
      </p>
    </div>
  );
}
