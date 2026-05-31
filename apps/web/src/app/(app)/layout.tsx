"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { Sidebar } from '../../components/Sidebar';
import { Loader2, Rss, Compass, PlusSquare, MessageSquare } from 'lucide-react';
import { VideoCall } from '../../components/VideoCall';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeCall, setActiveCall] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/');
        return;
      }
      setSession(session);

      // Fetch profile
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      setProfile(data);
      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/');
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // Global Call Listener
  useEffect(() => {
    if (!session) return;

    const globalCallChannel = supabase.channel(`user-calls-${session.user.id}`);
    globalCallChannel
      .on('broadcast', { event: 'signal' }, ({ payload }) => {
        if (payload.type === 'offer' && payload.senderId !== session.user.id) {
          console.log('Global incoming call received:', payload);
          setActiveCall({
            conversationId: payload.conversationId,
            callType: payload.callType,
            otherUser: payload.callerProfile,
            incomingOfferPayload: payload
          });
        }
      })
      .subscribe();

    const handleStartCall = (e: Event) => {
      const { conversationId, callType, otherUser } = (e as CustomEvent).detail;
      setActiveCall({
        conversationId,
        callType,
        otherUser,
        incomingOfferPayload: null
      });
    };

    window.addEventListener('guff-start-call', handleStartCall);

    return () => {
      supabase.removeChannel(globalCallChannel);
      window.removeEventListener('guff-start-call', handleStartCall);
    };
  }, [session]);

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-guff-primary)]" />
      </div>
    );
  }

  const mobileNavItems = [
    { icon: Rss, label: 'Feed', path: '/feed' },
    { icon: Compass, label: 'Explore', path: '/explore' },
    { icon: PlusSquare, label: 'Create', path: '/create' },
    { icon: MessageSquare, label: 'Messages', path: '/messages' },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0 bg-[var(--color-guff-surface-bright)]">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[var(--color-guff-surface)]/90 backdrop-blur-md border-t border-[var(--color-guff-border)]/40 z-40 flex items-center justify-around px-4 shadow-lg rounded-t-xl select-none">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.path || pathname.startsWith(item.path + '/');
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`flex flex-col items-center justify-center py-1 px-3.5 rounded-xl transition-all duration-200 cursor-pointer ${
                active 
                  ? 'text-[var(--color-guff-primary)] bg-[var(--color-guff-primary-light)] font-bold scale-105' 
                  : 'text-[var(--color-guff-text-secondary)] hover:text-[var(--color-guff-text)]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
            </button>
          );
        })}

        {/* Profile tab */}
        <button
          onClick={() => router.push(`/profile/${profile?.id}`)}
          className={`flex flex-col items-center justify-center p-1 rounded-xl transition-all duration-200 cursor-pointer ${
            pathname.startsWith(`/profile/${profile?.id}`)
              ? 'text-[var(--color-guff-primary)] bg-[var(--color-guff-primary-light)] font-bold scale-105'
              : 'text-[var(--color-guff-text-secondary)] hover:text-[var(--color-guff-text)]'
          }`}
        >
          <div className="w-5.5 h-5.5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-[9px] font-bold overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              profile?.username?.[0]?.toUpperCase() || '?'
            )}
          </div>
          <span className="text-[10px] mt-0.5 font-medium">Profile</span>
        </button>
      </nav>

      {/* Fullscreen Video / Audio Call Overlay */}
      {activeCall && (
        <VideoCall
          conversationId={activeCall.conversationId}
          currentUserId={session.user.id}
          currentUserProfile={profile}
          otherUser={activeCall.otherUser}
          initialCallType={activeCall.callType}
          incomingOfferPayload={activeCall.incomingOfferPayload}
          onClose={() => setActiveCall(null)}
        />
      )}
    </div>
  );
}
