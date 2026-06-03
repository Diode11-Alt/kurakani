"use client";

import { useEffect } from "react";
import toast from "react-hot-toast";
import { useUIStore } from "../store/uiStore";

export function OfflineDetector() {
  const setOnlineStatus = useUIStore((state) => state.setOnlineStatus);

  useEffect(() => {
    const handleOnline = () => {
      setOnlineStatus(true);
      toast.success("Back online!", { id: "network-status" });
    };

    const handleOffline = () => {
      setOnlineStatus(false);
      toast.error("You are offline. Trying to reconnect...", { id: "network-status", duration: Infinity });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setOnlineStatus]);

  return null;
}
