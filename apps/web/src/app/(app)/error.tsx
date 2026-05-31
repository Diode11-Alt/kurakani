"use client";

import { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[var(--color-guff-background)] text-[var(--color-guff-text)]">
      <h2 className="text-2xl font-bold text-red-500 mb-4">Something went wrong!</h2>
      <p className="mb-6 opacity-70">We encountered an unexpected error.</p>
      <button
        onClick={() => reset()}
        className="px-6 py-2 bg-[var(--color-guff-primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
      >
        Try again
      </button>
    </div>
  );
}
