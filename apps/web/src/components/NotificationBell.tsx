"use client";

import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Bell, Heart, MessageCircle, UserPlus, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function NotificationBell({ userId }: { userId: string }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*, actor:actor_id(id, username, display_name, avatar_url)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    };

    fetchNotifications();

    const channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        fetchNotifications(); // Refresh on new insert
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        fetchNotifications(); // Refresh on read update
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleNotificationClick = async (notif: any) => {
    if (!notif.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
    }
    setIsOpen(false);

    // Navigation logic based on type
    if (notif.type === 'like' || notif.type === 'comment') {
      // It's usually better to navigate to a specific post page, but since we don't have a single post view yet, 
      // navigate to feed or the user's profile where the post might be.
      router.push(`/profile/${userId}`); 
    } else if (notif.type === 'follow' || notif.type === 'friend_request' || notif.type === 'request_accepted') {
      router.push(`/profile/${notif.actor_id}`);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="w-4 h-4 text-red-500 fill-red-500" />;
      case 'comment': return <MessageCircle className="w-4 h-4 text-blue-500 fill-blue-500" />;
      case 'follow': return <UserPlus className="w-4 h-4 text-green-500" />;
      case 'request_accepted': return <Check className="w-4 h-4 text-indigo-500" />;
      default: return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getMessage = (notif: any) => {
    const name = notif.actor?.display_name || notif.actor?.username || 'Someone';
    switch (notif.type) {
      case 'like': return <span className="text-sm"><span className="font-semibold">{name}</span> liked your post.</span>;
      case 'comment': return <span className="text-sm"><span className="font-semibold">{name}</span> commented on your post.</span>;
      case 'follow': return <span className="text-sm"><span className="font-semibold">{name}</span> started following you.</span>;
      case 'friend_request': return <span className="text-sm"><span className="font-semibold">{name}</span> sent you a connection request.</span>;
      case 'request_accepted': return <span className="text-sm"><span className="font-semibold">{name}</span> accepted your connection request.</span>;
      default: return <span className="text-sm">New notification from {name}.</span>;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--color-guff-text-secondary)] hover:bg-[var(--color-guff-surface-container-low)] hover:text-[var(--color-guff-text)] transition-all cursor-pointer relative"
      >
        <div className="relative flex-shrink-0">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-[var(--color-guff-surface)]">
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
        </div>
        <span className="hidden lg:block">Notifications</span>
      </button>

      {isOpen && (
        <div className="fixed top-0 bottom-0 left-[72px] lg:left-[240px] w-[350px] bg-[var(--color-guff-surface)] border-r border-[var(--color-guff-border)] shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-left-4 duration-200">
          <div className="p-4 border-b border-[var(--color-guff-border)] flex items-center justify-between bg-[var(--color-guff-surface-container-low)]">
            <h2 className="font-extrabold text-xl tracking-tight text-[var(--color-guff-text)]">Notifications</h2>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-sm text-[var(--color-guff-primary)] hover:underline font-bold cursor-pointer">
                Mark all read
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-[var(--color-guff-text-muted)] text-sm flex flex-col items-center gap-3">
                <Bell className="w-8 h-8 opacity-20" />
                No notifications yet.
              </div>
            ) : (
              <div className="flex flex-col">
                {notifications.map((notif) => (
                  <button 
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-4 border-b border-[var(--color-guff-border)]/50 flex items-start gap-4 hover:bg-[var(--color-guff-surface-container-low)] transition-colors text-left w-full cursor-pointer ${!notif.is_read ? 'bg-blue-50/30' : ''}`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-[var(--color-guff-surface-container)] overflow-hidden">
                        {notif.actor?.avatar_url ? (
                          <img src={notif.actor.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-gray-500 text-lg">
                            {notif.actor?.username?.[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
                        {getIcon(notif.type)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[var(--color-guff-text)] leading-snug">
                        {getMessage(notif)}
                      </div>
                      <div className="text-xs text-[var(--color-guff-text-muted)] mt-1.5 font-medium">
                        {new Date(notif.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                    {!notif.is_read && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-guff-primary)] flex-shrink-0 mt-2" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
