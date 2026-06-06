"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "../../store/authStore";
import { Sidebar } from "./Sidebar";
import { BottomNavBar } from "./BottomNavBar";
import { MobileHeader } from "./MobileHeader";
import { VideoCall } from "../../components/VideoCall";
import { supabase } from "../../lib/supabase";

import { WebSignalStore } from "../../lib/crypto/WebSignalStore";
import { generateSignalRegistrationPayload } from "../../lib/crypto/registration";
import { uploadSignalKeys } from "../../lib/api";
import { useUIStore } from "../../store/uiStore";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { session: authSession, isLoading: authLoading } = useAuthStore();
  const { activeCall, setActiveCall } = useUIStore();
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Wait for Supabase to resolve session from localStorage before deciding
    if (authLoading) return;

    // Strict Zero-Knowledge Auth Check
    // If we have no session, we are totally unauthenticated.
    if (!authSession) {
      router.replace("/login");
      return;
    }


    // Register Web Push Token (Skipped for now during Supabase migration)
    const registerPushToken = async () => {
      console.log('Push token registration skipped in MVP');
    };
    
    registerPushToken();

    // E2EE Key Initialization
    const initE2EE = async () => {
      if (!authSession?.user?.id) return;

      // Ensure deviceId exists — generate if missing
      let { deviceId } = useAuthStore.getState();
      if (!deviceId) {
        const arr = new Uint32Array(1);
        crypto.getRandomValues(arr);
        deviceId = (arr[0] % 2147483646) + 1;
        useAuthStore.getState().setDeviceId(deviceId);
      }

      try {
        const store = new WebSignalStore();
        const isInit = await store.isInitialized();

        // Also verify server has our keys — re-upload if missing
        if (!isInit) {
          console.log("E2EE: Generating and uploading local keys...");
          const payload = await generateSignalRegistrationPayload(store);
          await uploadSignalKeys(authSession.user.id, deviceId, payload);
          console.log("E2EE: Keys uploaded successfully.");
        } else {
          // Verify server has the keys even if local store is initialized
          const { data: existingKey } = await supabase
            .from('identity_keys')
            .select('device_id, identity_key')
            .eq('user_id', authSession.user.id)
            .maybeSingle();

          if (!existingKey || !existingKey.identity_key) {
            console.log("E2EE: Local keys missing or broken on server — re-uploading...");
            const payload = await generateSignalRegistrationPayload(store);
            await uploadSignalKeys(authSession.user.id, deviceId, payload);
            console.log("E2EE: Keys re-uploaded.");
          }
        }
      } catch (err) {
        console.error("E2EE Init Error:", err);
      }
    };

    initE2EE();
  }, [authSession, mounted, router]);

  // Get Supabase session for incoming call listener and Presence
  useEffect(() => {
    if (!mounted) return;
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (s) setSession(s);
    }).catch(console.warn);

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
        const state = presenceChannel.presenceState();
        const onlineUsersMap: Record<string, boolean> = {};
        for (const id in state) {
          onlineUsersMap[id] = true;
        }
        useUIStore.getState().setOnlineUsers(onlineUsersMap);
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

  // Listen for incoming calls and mark messages as delivered via Supabase Broadcast & Realtime
  useEffect(() => {
    if (!session?.user?.id) return;

    const userId = session.user.id;
    const incomingChannel = supabase.channel(`user-global-${userId}`);

    incomingChannel
      .on('broadcast', { event: 'signal' }, ({ payload }) => {
        if (payload.type === 'offer' && payload.senderId !== userId) {
          console.log('[AppShell] Incoming call from:', payload.callerProfile?.username);
          const currentCall = useUIStore.getState().activeCall;
          if (currentCall) return;
          setActiveCall({
            conversationId: payload.conversationId,
            callType: payload.callType || 'video',
            otherUser: payload.callerProfile || { username: 'Unknown' },
            incomingOfferPayload: payload,
          });
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const msg = payload.new;
        if (msg.sender_id !== userId && !msg.delivered_at) {
          // Send Delivery Receipt
          await supabase
            .from('messages')
            .update({ delivered_at: new Date().toISOString() })
            .eq('id', msg.id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(incomingChannel);
    };
  }, [session?.user?.id]);

  // Prevent SSR flash of unauthenticated content
  if (!mounted || authLoading || !authSession) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-base">
        <div className="flex flex-col items-center gap-4">
          <span className="material-symbols-outlined animate-spin text-brand text-4xl">
            sync
          </span>
          <p className="text-content-muted font-medium animate-pulse">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  const isChatThread = pathname?.match(/^\/messages\/[a-zA-Z0-9-]+$/);

  return (
    <div className="flex h-screen overflow-hidden bg-base text-content">
      <Sidebar />
      {!isChatThread && <MobileHeader />}
      
      <main className={`flex-1 md:ml-64 overflow-y-auto relative z-10 ${isChatThread ? '' : 'pt-20 md:pt-0 pb-32 md:pb-0'}`}>
        <div className="max-w-[1280px] mx-auto h-full">
          {children}
        </div>
      </main>

      {!isChatThread && <BottomNavBar />}

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
