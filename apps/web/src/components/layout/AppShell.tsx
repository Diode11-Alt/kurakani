"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/authStore";
import { Sidebar } from "./Sidebar";
import { BottomNavBar } from "./BottomNavBar";
import { MobileHeader } from "./MobileHeader";
import { VideoCall } from "../../components/VideoCall";
import { supabase } from "../../lib/supabase";

import { useUIStore } from "../../store/uiStore";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session: authSession, isKeysGenerated } = useAuthStore();
  const { activeCall, setActiveCall } = useUIStore();
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Strict Zero-Knowledge Auth Check
    // If we have no session, we are totally unauthenticated.
    if (!authSession) {
      router.replace("/login");
      return;
    }

    // If we have a JWT, but the local hardware Keystore hasn't generated the
    // KDS (Key Distribution Server) payload (100 OTPKs + SPK), we are in a broken state.
    // We should log them out so they can log back in and generate keys properly.
    if (!isKeysGenerated) {
      useAuthStore.getState().clearAuth();
      router.replace("/login");
      return;
    }

    // Register Web Push Token (Skipped for now during Supabase migration)
    const registerPushToken = async () => {
      // Push tokens will need to be saved directly to a Supabase table
      // e.g., supabase.from('push_tokens').upsert({ token, user_id })
      console.log('Push token registration skipped in MVP');
    };
    
    registerPushToken();
  }, [authSession, isKeysGenerated, mounted, router]);

  // Get Supabase session for incoming call listener and Presence
  useEffect(() => {
    if (!mounted) return;
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (s) setSession(s);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [mounted]);

  // Supabase Presence Tracking
  useEffect(() => {
    if (!session?.user?.id) return;

    const presenceChannel = supabase.channel('global-presence', {
      config: {
        presence: { key: session.user.id }
      }
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        // We could sync this to uiStore if we needed to know WHO is online globally, 
        // but for now we just track our own presence
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            online_at: new Date().toISOString(),
            user_id: session.user.id
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [session?.user?.id]);

  // Listen for outgoing call events from chat thread page
  useEffect(() => {
    const handleStartCall = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.conversationId && detail.otherUser) {
        setActiveCall({
          conversationId: detail.conversationId,
          callType: detail.callType || 'video',
          otherUser: detail.otherUser,
        });
      }
    };

    window.addEventListener('guff-start-call', handleStartCall);
    return () => window.removeEventListener('guff-start-call', handleStartCall);
  }, []);

  // Listen for incoming calls via Supabase Broadcast
  useEffect(() => {
    if (!session?.user?.id) return;

    const userId = session.user.id;
    const incomingChannel = supabase.channel(`user-calls-${userId}`);

    incomingChannel
      .on('broadcast', { event: 'signal' }, ({ payload }) => {
        if (payload.type === 'offer' && payload.senderId !== userId) {
          console.log('[AppShell] Incoming call from:', payload.callerProfile?.username);

          // Get the latest state directly from the store to avoid stale closures
          const currentCall = useUIStore.getState().activeCall;

          // Don't interrupt an existing call
          if (currentCall) {
            console.log('[AppShell] Already in a call, ignoring incoming');
            return;
          }

          setActiveCall({
            conversationId: payload.conversationId,
            callType: payload.callType || 'video',
            otherUser: payload.callerProfile || { username: 'Unknown' },
            incomingOfferPayload: payload,
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(incomingChannel);
    };
  }, [session?.user?.id]);

  // Prevent SSR flash of unauthenticated content
  if (!mounted || !authSession || !isKeysGenerated) {
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
      
      <main className="flex-1 md:ml-64 pt-20 md:pt-0 pb-32 md:pb-0 overflow-y-auto relative z-10">
        <div className="max-w-[1280px] mx-auto">
          {children}
        </div>
      </main>

      <BottomNavBar />

      {/* Video Call Overlay */}
      {activeCall && (
        <VideoCall
          conversationId={activeCall.conversationId}
          currentUserId={session?.user?.id || ''}
          currentUserProfile={session?.user?.user_metadata || {}}
          otherUser={activeCall.otherUser}
          initialCallType={activeCall.callType}
          incomingOfferPayload={activeCall.incomingOfferPayload || null}
          onClose={() => setActiveCall(null)}
        />
      )}
    </div>
  );
}
