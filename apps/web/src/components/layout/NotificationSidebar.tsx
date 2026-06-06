"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Notification } from '@/types';

export function NotificationSidebar({ userId, isOpen, onClose }: { userId: string, isOpen: boolean, onClose: () => void }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*, actor:actor_id(id, username, display_name, avatar_url)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    };

    fetchNotifications();

    const channel = supabase
      .channel('public:notifications:sidebar')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
    }
    onClose();

    if (notif.type === 'like' || notif.type === 'comment') {
      router.push(`/profile/${userId}`); 
    } else {
      router.push(`/profile/${notif.actor?.id}`);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <span className="material-symbols-outlined text-[14px] text-red-500" style={{fontVariationSettings: "'FILL' 1"}}>favorite</span>;
      case 'comment': return <span className="material-symbols-outlined text-[14px] text-blue-500" style={{fontVariationSettings: "'FILL' 1"}}>chat_bubble</span>;
      case 'follow': return <span className="material-symbols-outlined text-[14px] text-green-500">person_add</span>;
      case 'request_accepted': return <span className="material-symbols-outlined text-[14px] text-indigo-500">how_to_reg</span>;
      default: return <span className="material-symbols-outlined text-[14px] text-gray-500">notifications</span>;
    }
  };

  const getMessage = (notif: Notification) => {
    const name = notif.actor?.display_name || notif.actor?.username || 'Someone';
    switch (notif.type) {
      case 'like': return <span className="text-sm"><span className="font-bold">{name}</span> liked your post.</span>;
      case 'comment': return <span className="text-sm"><span className="font-bold">{name}</span> commented on your post.</span>;
      case 'follow': return <span className="text-sm"><span className="font-bold">{name}</span> started following you.</span>;
      case 'friend_request': return <span className="text-sm"><span className="font-bold">{name}</span> sent you a connection request.</span>;
      case 'request_accepted': return <span className="text-sm"><span className="font-bold">{name}</span> accepted your connection request.</span>;
      default: return <span className="text-sm">New notification from {name}.</span>;
    }
  };

  return (
    <>
      {/* Backdrop for mobile or clicking outside on desktop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* The Sidebar panel */}
      <div 
        className={`fixed top-0 bottom-0 left-0 md:left-64 w-full md:w-[350px] bg-[var(--color-surface)] border-r border-[var(--color-outline-variant)]/50 shadow-2xl z-[65] flex flex-col overflow-hidden transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          isOpen ? 'translate-x-0' : '-translate-x-[110%]'
        }`}
      >
        <div className="p-5 border-b border-[var(--color-outline-variant)]/50 flex items-center justify-between bg-[var(--color-surface-container-lowest)]">
          <h2 className="font-display-lg text-2xl font-black text-[var(--color-on-surface)]">Notifications</h2>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="text-sm text-[var(--color-primary)] hover:underline font-bold cursor-pointer bg-transparent border-none">
              Mark all read
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto bg-[var(--color-surface)]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-[var(--color-on-surface-variant)] text-sm flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-[48px] opacity-20">notifications</span>
              No notifications yet.
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notif) => (
                <button 
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-4 border-b border-[var(--color-outline-variant)]/30 flex items-start gap-4 hover:bg-[var(--color-surface-container)] transition-colors text-left w-full cursor-pointer ${!notif.is_read ? 'bg-[var(--color-primary)]/5' : ''}`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-[var(--color-primary-container)] overflow-hidden flex items-center justify-center text-white font-bold text-lg relative">
                      {notif.actor?.avatar_url ? (
                        <Image src={notif.actor.avatar_url} alt="" fill sizes="48px" className="object-cover" />
                      ) : (
                        notif.actor?.username?.[0]?.toUpperCase() || '?'
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-[var(--color-surface)] rounded-full p-1 shadow-sm flex items-center justify-center border border-[var(--color-outline-variant)]/30">
                      {getIcon(notif.type)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[var(--color-on-surface)] leading-snug">
                      {getMessage(notif)}
                    </div>
                    <div className="text-xs text-[var(--color-on-surface-variant)] mt-1.5 font-medium font-mono">
                      {new Date(notif.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                  {!notif.is_read && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)] flex-shrink-0 mt-2" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
