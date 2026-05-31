"use client";

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// The Create button in the sidebar just redirects to the feed where the composer lives
export default function CreatePage() {
  const router = useRouter();
  useEffect(() => { router.replace('/feed'); }, [router]);
  return null;
}
