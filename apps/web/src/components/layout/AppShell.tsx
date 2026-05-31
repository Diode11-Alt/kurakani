"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "../../store/appStore";
import { Sidebar } from "./Sidebar";
import { BottomNavBar } from "./BottomNavBar";
import { MobileHeader } from "./MobileHeader";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { jwt, isKeysGenerated } = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Strict Zero-Knowledge Auth Check
    // If we have no JWT, we are totally unauthenticated.
    if (!jwt) {
      router.replace("/login");
      return;
    }

    // If we have a JWT, but the local hardware Keystore hasn't generated the
    // KDS (Key Distribution Server) payload (100 OTPKs + SPK), we are in a broken state.
    // We should redirect to the key generation loading screen.
    if (!isKeysGenerated) {
      router.replace("/register/keys");
      return;
    }
  }, [jwt, isKeysGenerated, mounted, router]);

  // Prevent SSR flash of unauthenticated content
  if (!mounted || !jwt || !isKeysGenerated) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-base">
        <div className="flex flex-col items-center gap-4">
          <span className="material-symbols-outlined animate-spin text-brand text-4xl">
            sync
          </span>
          <p className="text-content-muted font-medium animate-pulse">
            Verifying secure session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-base text-content">
      <Sidebar />
      <MobileHeader />
      
      <main className="flex-1 md:ml-64 pt-20 md:pt-md pb-32 px-md md:px-xl overflow-y-auto relative z-10">
        <div className="max-w-[1280px] mx-auto">
          {children}
        </div>
      </main>

      <BottomNavBar />
    </div>
  );
}
