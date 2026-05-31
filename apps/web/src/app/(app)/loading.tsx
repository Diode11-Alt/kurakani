import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-[var(--color-guff-surface-bright)]">
      <Loader2 className="w-8 h-8 animate-spin text-[var(--color-guff-primary)] mb-4" />
      <p className="text-[var(--color-guff-text-secondary)] font-medium text-sm animate-pulse">Loading...</p>
    </div>
  );
}
