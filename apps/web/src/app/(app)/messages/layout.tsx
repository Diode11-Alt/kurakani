"use client";

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { formatDistanceToNowStrict } from 'date-fns';
import { Search, MessageSquare, Loader2, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { db } from '../../../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { supabase } from '../../../lib/supabase';
import { useUIStore } from '../../../store/uiStore';
import toast from 'react-hot-toast';

// Decrypting messages in the sidebar is unsafe in Signal protocol because decryption 
// advances the cryptographic ratchet. We just show an encrypted indicator.

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  const liveConversations = useLiveQuery(
    () => db.local_conversations.orderBy('updatedAt').reverse().toArray(),
    []
  );
  const conversations = liveConversations || [];
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Record<string, unknown>[]>([]);
  const [searching, setSearching] = useState(false);
  
  const { session: authSession, userId } = useAuthStore();
  const { onlineUsers } = useUIStore();

  const pathname = usePathname();
  const router = useRouter();

  const pathParts = pathname.split('/');
  const activeId = pathParts.length > 2 && pathParts[1] === 'messages' ? pathParts[2] : null;

  useEffect(() => {
    const init = async () => {
      if (!authSession || !userId) {
        router.push('/login');
        return;
      }
      await loadConversations();
      setLoading(false);
    };
    init();
  }, [pathname, authSession, userId]);

  useEffect(() => {
    if (!userId) return;

    // Supabase Realtime for fetching conversation list automatically when new messages arrive
    const messagesChannel = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        // Just reload the list if someone sends us a message
        loadConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [userId]);

  async function loadConversations() {
    if (!userId) return;
    try {
      // 1. Fetch memberships for the current user
      const { data: myMemberships, error: memErr } = await supabase
        .from('conversation_members')
        .select(`
          conversation_id,
          conversations!inner (
            id, type, name, avatar_url, updated_at
          )
        `)
        .eq('user_id', userId);

      if (memErr || !myMemberships) {
        console.error("loadConversations: Error fetching memberships", memErr);
        return;
      }

      console.log("loadConversations: myMemberships", myMemberships);
      const convIds = myMemberships.map(m => m.conversation_id);
      
      if (convIds.length === 0) {
        console.log("loadConversations: No conversations found for user");
        return;
      }

      // 2. Fetch all members for these conversations to find the "otherUser"
      const { data: allMembers, error: membersError } = await supabase
        .from('conversation_members')
        .select(`
          conversation_id,
          user_id,
          users (
            id, username, display_name, avatar_url
          )
        `)
        .in('conversation_id', convIds);
        
      if (membersError || !allMembers) {
        console.error("loadConversations: Error fetching allMembers", membersError);
        return;
      }
      console.log("loadConversations: allMembers", allMembers);

      // 3. Fetch latest messages for each conversation
      const { data: allMessages, error: msgErr } = await supabase
        .from('messages')
        .select('id, conversation_id, ciphertext_plaintext_legacy, media_url, sent_at, sender_id, read_at')
        .in('conversation_id', convIds)
        .order('sent_at', { ascending: false });
        
      if (msgErr) {
        console.error("loadConversations: Error fetching messages", msgErr);
        // Continue anyway to show empty conversations
      }
      
      const latestMessagesMap: Record<string, unknown> = {};
      if (allMessages) {
        for (const msg of allMessages) {
          if (!latestMessagesMap[msg.conversation_id]) {
            latestMessagesMap[msg.conversation_id] = msg;
          }
        }
      }

      // 4. Fetch unread counts
      const { data: unreadData } = await supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', convIds)
        .neq('sender_id', userId)
        .is('read_at', null);
        
      const unreadMap: Record<string, number> = {};
      if (unreadData) {
        unreadData.forEach(m => {
          unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] || 0) + 1;
        });
      }

      const enriched = myMemberships.map((membership) => {
        const c = membership.conversations as Record<string, unknown>;
        const members = allMembers.filter(m => m.conversation_id === c.id);
        const otherUserMember = members.find(m => m.user_id !== userId);
        const otherUser = otherUserMember?.users || { username: 'Unknown' };

        const lastMsg = latestMessagesMap[c.id];
        let decryptedLastMsg = null;
        
        if (lastMsg) {
          decryptedLastMsg = {
            id: lastMsg.id,
            conversation_id: lastMsg.conversation_id,
            senderId: lastMsg.sender_id,
            sentAt: lastMsg.sent_at,
            readAt: lastMsg.read_at,
            content: lastMsg.ciphertext_plaintext_legacy || (lastMsg.media_url || lastMsg.ciphertext ? 'Attachment 📎' : 'Empty message')
          };
        }

        return {
          id: c.id,
          type: c.type,
          name: c.name,
          avatarUrl: c.avatar_url,
          last_message_at: lastMsg?.sent_at || c.updated_at,
          unreadCount: unreadMap[c.id] || 0,
          otherUser: otherUser as Record<string, unknown>,
          lastMessage: decryptedLastMsg,
        };
      });

      enriched.sort((a, b) => {
        const timeA = new Date(a.last_message_at).getTime();
        const timeB = new Date(b.last_message_at).getTime();
        return timeB - timeA;
      });

      await db.transaction('rw', db.local_conversations, async () => {
        const records = enriched.map(conv => ({
          id: conv.id,
          type: conv.type || 'direct',
          name: conv.name || null,
          avatarUrl: conv.avatarUrl || null,
          updatedAt: new Date(conv.last_message_at),
          unreadCount: conv.unreadCount,
          otherUser: {
            id: (conv.otherUser as Record<string, unknown>).id || 'unknown',
            username: (conv.otherUser as Record<string, unknown>).username || 'Unknown',
            displayName: (conv.otherUser as Record<string, unknown>).display_name || null,
            avatarUrl: (conv.otherUser as Record<string, unknown>).avatar_url || null,
          },
          lastMessage: conv.lastMessage
        }));
        await db.local_conversations.bulkPut(records);
      });
    } catch (err) {
      console.error('Error loading conversations:', err);
    }
  }

  useEffect(() => {
    if (!searchQuery.trim() || !userId) {
      setSearchResults([]);
      return;
    }

    const abortController = new AbortController();

    const delayDebounceFn = setTimeout(async () => {
      setSearching(true);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, username, display_name, avatar_url')
          .ilike('username', `%${searchQuery.trim()}%`)
          .neq('id', userId)
          .limit(10)
          .abortSignal(abortController.signal);
        
        if (error) throw error;
        
        const mappedData = data.map(u => ({
          userId: u.id,
          username: u.username,
          displayName: u.display_name,
          avatarUrl: u.avatar_url
        }));
        
        setSearchResults(mappedData);
      } catch (err: unknown) {
        if (err.name === 'AbortError') return;
        console.error('Error searching profiles:', err);
      } finally {
        if (!abortController.signal.aborted) {
          setSearching(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(delayDebounceFn);
      abortController.abort();
    };
  }, [searchQuery, userId]);

  const startConversation = async (otherUserId: string) => {
    if (!userId) return;
    setSearchQuery('');
    setSearchResults([]);
    try {
      // 1. Check if conversation already exists
      const { data: existingMemberships } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', userId);

      const convIds = (existingMemberships || []).map(m => m.conversation_id);

      let conversationId = null;
      if (convIds.length > 0) {
        const { data: commonConv } = await supabase
          .from('conversation_members')
          .select('conversation_id')
          .in('conversation_id', convIds)
          .eq('user_id', otherUserId)
          .limit(1)
          .maybeSingle();
        conversationId = commonConv?.conversation_id;
      }

      // 2. Create if doesn't exist
      if (!conversationId) {
        const newConvId = crypto.randomUUID();
        console.log('Inserting conversation...');
        const { error: convErr } = await supabase
          .from('conversations')
          .insert({ id: newConvId, type: 'direct', created_by: userId });
        if (convErr) {
          console.error('Conversation insert error:', convErr);
          throw convErr;
        }

        conversationId = newConvId;

        console.log('Inserting creator member...');
        const { error: memErr1 } = await supabase.from('conversation_members').insert(
          { conversation_id: conversationId, user_id: userId }
        );
        if (memErr1) {
          console.error('Member 1 insert error:', memErr1);
          throw memErr1;
        }

        console.log('Inserting other member...');
        const { error: memErr2 } = await supabase.from('conversation_members').insert(
          { conversation_id: conversationId, user_id: otherUserId }
        );
        if (memErr2) {
          console.error('Member 2 insert error:', memErr2);
          throw memErr2;
        }
        console.log('Successfully inserted all rows');
      }
      router.push(`/messages/${conversationId}`);
    } catch (err) {
      console.error('Error creating conversation:', err);
      toast.error('Failed to start conversation');
    }
  };

  const isInboxRoute = pathname === '/messages';

  return (
    <div className="flex w-full h-[calc(100vh-64px)] md:h-screen overflow-hidden bg-[var(--color-background)]">
      <div
        className={`w-full md:w-[360px] border-r border-[var(--color-outline-variant)] flex flex-col flex-shrink-0 bg-[var(--color-surface)] relative z-10
          ${!isInboxRoute ? 'hidden md:flex' : 'flex'}`}
      >
        <div className="p-4 border-b border-[var(--color-outline-variant)] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-[var(--color-on-surface)]">Chats</h2>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[var(--color-on-surface-variant)]" />
            <input
              type="text"
              placeholder="Search users to chat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--color-surface-container-low)] border-none rounded-xl pl-10 pr-4 py-2.5 text-xs focus:ring-2 focus:ring-[var(--color-primary)] outline-none text-[var(--color-on-surface)]"
            />
          </div>

          {searchQuery.trim() !== '' && (
            <div className="absolute left-4 right-4 md:left-4 md:w-[328px] mt-1 bg-[var(--color-surface-container-high)] rounded-xl shadow-xl py-2 z-50 max-h-[250px] overflow-y-auto">
              {searching ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--color-primary)]" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-4 text-xs text-[var(--color-on-surface-variant)]">No users found</div>
              ) : (
                searchResults.map((user) => (
                  <button
                    key={user.userId}
                    onClick={() => startConversation(user.userId)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--color-surface-variant)] text-left transition-colors cursor-pointer"
                  >
                    <div className="w-8 h-8 squircle bg-[var(--color-primary-container)] flex items-center justify-center text-[var(--color-on-primary-container)] font-bold overflow-hidden text-xs">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        user.username?.[0]?.toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-[var(--color-on-surface)]">
                        {user.displayName || user.username}
                      </div>
                      <div className="text-[10px] text-[var(--color-on-surface-variant)]">@{user.username}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-4 h-full text-center mt-10">
              <div className="w-20 h-20 bg-[var(--color-primary-container)] rounded-full flex items-center justify-center mb-5 shadow-inner">
                <MessageSquare className="w-10 h-10 text-[var(--color-on-primary-container)]" />
              </div>
              <h3 className="font-bold text-xl text-[var(--color-on-surface)]">No messages yet</h3>
              <p className="text-sm text-[var(--color-on-surface-variant)] mt-2 max-w-[220px] mb-8">
                Connect with friends and start your first secure conversation.
              </p>
              <button 
                onClick={() => document.querySelector<HTMLInputElement>('input[placeholder="Search users to chat..."]')?.focus()}
                className="bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-container)] transition-colors flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-sm shadow-md active:scale-95"
              >
                <Search className="w-4 h-4" />
                Find people
              </button>
            </div>
          ) : (
            conversations.map((c) => {
              const active = activeId === c.id;
              const hasUnread = c.unreadCount && c.unreadCount > 0;

              const timeDisplay = c.lastMessage
                ? formatDistanceToNowStrict(new Date((c.lastMessage as Record<string, unknown>).sentAt as string), { addSuffix: false })
                    .replace(' seconds', 's')
                    .replace(' second', 's')
                    .replace(' minutes', 'm')
                    .replace(' minute', 'm')
                    .replace(' hours', 'h')
                    .replace(' hour', 'h')
                    .replace(' days', 'd')
                    .replace(' day', 'd')
                : '';

              return (
                <button
                  key={c.id}
                  onClick={() => router.push(`/messages/${c.id}`)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all duration-200 cursor-pointer border-l-4
                    ${active 
                      ? 'bg-[var(--color-primary-container)] border-[var(--color-primary)]' 
                      : 'hover:bg-[var(--color-surface-container-low)] border-transparent'}`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 squircle bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                      {(c.otherUser as Record<string, unknown>)?.avatarUrl ? (
                        <img src={(c.otherUser as Record<string, unknown>).avatarUrl as string} alt="" className="w-full h-full object-cover" />
                      ) : (
                        c.otherUser?.username?.[0]?.toUpperCase() || '?'
                      )}
                    </div>
                    {onlineUsers[(c.otherUser as Record<string, unknown>)?.id as string] && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[var(--color-surface)] rounded-full z-10 shadow-sm"></div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-sm truncate max-w-[150px]
                        ${hasUnread ? 'font-bold text-[var(--color-on-surface)]' : 'font-semibold text-[var(--color-on-surface)]'}`}
                      >
                        {(c.otherUser as Record<string, unknown>)?.displayName as string || c.otherUser?.username || 'Unknown User'}
                      </span>
                      <span className={`text-[10px] flex-shrink-0 ${hasUnread ? 'text-[var(--color-primary)] font-bold' : 'text-[var(--color-on-surface-variant)]'}`}>
                        {timeDisplay}
                      </span>
                    </div>

                    <p className={`text-xs truncate
                      ${hasUnread ? 'font-bold text-[var(--color-on-surface)]' : 'text-[var(--color-on-surface-variant)]'}`}
                    >
                      {c.lastMessage
                        ? `${(c.lastMessage as Record<string, unknown>).senderId === userId ? 'You: ' : ''}${(c.lastMessage as Record<string, unknown>).content}`
                        : 'No messages yet'}
                    </p>
                  </div>

                  {hasUnread ? (
                    <div className="w-5 h-5 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 shadow-sm">
                      {c.unreadCount > 99 ? '99+' : c.unreadCount}
                    </div>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className={`flex-1 flex flex-col h-full bg-[var(--color-background)] relative
        ${isInboxRoute ? 'hidden md:flex' : 'flex'}`}
      >
        {children}
      </div>
    </div>
  );
}
