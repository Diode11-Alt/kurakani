"use client";

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { formatDistanceToNowStrict } from 'date-fns';
import { Search, MessageSquare, Loader2, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { WebSignalStore } from '../../../lib/crypto/WebSignalStore';
import { establishSessionAsInitiator, encryptMessage } from '@signal/crypto';
import { db } from '../../../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { supabase } from '../../../lib/supabase';

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
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  
  const { session: authSession, userId } = useAuthStore();

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

      if (memErr || !myMemberships) return;

      const convIds = myMemberships.map(m => m.conversation_id);
      
      if (convIds.length === 0) {
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
        
      if (membersError || !allMembers) return;

      // 3. For each conversation, find the latest message 
      //    (we do this individually for simplicity, could be optimized via RPC if needed)
      const enriched = await Promise.all(
        myMemberships.map(async (row) => {
          // Depending on Supabase SDK version, inner join might be an array or object.
          // Usually it's an object if it's a 1:1 relation, but conversations is a 1:1 from member's perspective.
          const c: any = Array.isArray(row.conversations) ? row.conversations[0] : row.conversations;
          
          const members = allMembers.filter(m => m.conversation_id === c.id);
          const otherUserMember = members.find(m => m.user_id !== userId);
          const otherUser = otherUserMember?.users || { username: 'Unknown' };

          // Fetch last message from remote
          const { data: lastMsgData } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', c.id)
            .order('sent_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          let decryptedLastMsg = null;
          if (lastMsgData) {
            decryptedLastMsg = {
              ...lastMsgData,
              senderId: lastMsgData.sender_id,
              sentAt: lastMsgData.sent_at,
              readAt: lastMsgData.read_at,
              content: lastMsgData.sender_id === userId ? 'You sent a message' : 'Encrypted Message 🔒'
            };
          }

          return {
            id: c.id,
            type: c.type,
            name: c.name,
            avatarUrl: c.avatar_url,
            last_message_at: lastMsgData?.sent_at || c.updated_at,
            otherUser: otherUser as any,
            lastMessage: decryptedLastMsg,
          };
        })
      );

      enriched.sort((a, b) => {
        const timeA = new Date(a.last_message_at).getTime();
        const timeB = new Date(b.last_message_at).getTime();
        return timeB - timeA;
      });

      await db.transaction('rw', db.local_conversations, async () => {
        for (const conv of enriched) {
          await db.local_conversations.put({
            id: conv.id,
            type: conv.type || 'direct',
            name: conv.name || null,
            avatarUrl: conv.avatarUrl || null,
            updatedAt: new Date(conv.last_message_at),
            unreadCount: 0,
            otherUser: {
              id: (conv.otherUser as any).id || 'unknown',
              username: (conv.otherUser as any).username || 'Unknown',
              displayName: (conv.otherUser as any).display_name || null,
              avatarUrl: (conv.otherUser as any).avatar_url || null,
            },
            lastMessage: conv.lastMessage
          });
        }
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

    const delayDebounceFn = setTimeout(async () => {
      setSearching(true);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, username, display_name, avatar_url')
          .ilike('username', `%${searchQuery.trim()}%`)
          .neq('id', userId)
          .limit(10);
        
        if (error) throw error;
        
        const mappedData = data.map(u => ({
          userId: u.id,
          username: u.username,
          displayName: u.display_name,
          avatarUrl: u.avatar_url
        }));
        
        setSearchResults(mappedData);
      } catch (err) {
        console.error('Error searching profiles:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
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
        const { data: newConv, error: convErr } = await supabase
          .from('conversations')
          .insert({ type: 'direct', created_by: userId })
          .select()
          .single();
          
        if (convErr) throw convErr;
        conversationId = newConv.id;
        
        await supabase.from('conversation_members').insert([
          { conversation_id: conversationId, user_id: userId },
          { conversation_id: conversationId, user_id: otherUserId }
        ]);
      }
      
      // 3. Establish Signal Session if needed
      const store = new WebSignalStore();
      let existingSession = await store.loadSession(otherUserId + '.1'); // assuming deviceId = 1 for MVP

      if (!existingSession) {
        // Fetch Keys from Supabase Crypto tables
        const { data: ik } = await supabase.from('identity_keys').select('*').eq('user_id', otherUserId).single();
        const { data: spk } = await supabase.from('signed_pre_keys').select('*').eq('user_id', otherUserId).single();
        const { data: opks } = await supabase.from('one_time_pre_keys').select('*').eq('user_id', otherUserId).eq('used', false).limit(1);
        const { data: otherUser } = await supabase.from('users').select('registration_id').eq('id', otherUserId).single();
        
        if (!ik || !spk || !otherUser) {
          throw new Error("User has not set up E2EE keys");
        }
        
        const keyBundle = {
          identityKey: ik.identity_key,
          registrationId: otherUser.registration_id,
          signedPreKey: {
            keyId: spk.key_id,
            publicKey: spk.public_key,
            signature: spk.signature
          },
          oneTimePreKey: opks && opks.length > 0 ? {
            keyId: opks[0].key_id,
            publicKey: opks[0].public_key
          } : undefined
        };
        
        await establishSessionAsInitiator(store, otherUserId, 1, keyBundle);
        
        // Mark OTPK as used
        if (opks && opks.length > 0) {
          await supabase.from('one_time_pre_keys').update({ used: true, used_at: new Date().toISOString() }).eq('id', opks[0].id);
        }
      }

      // 4. Send initial "Hello 👋" to register the conversation visually
      const payload = JSON.stringify({ content: 'Hello 👋', media_url: null });
      const encrypted = await encryptMessage(store, otherUserId, 1, payload);

      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: userId,
        ciphertext: encrypted.body,
        ciphertext_type: encrypted.type,
        content_type: 'text'
      });

      router.push(`/messages/${conversationId}`);
    } catch (err) {
      console.error('Error creating conversation:', err);
      alert('Failed to start conversation');
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
                    onClick={() => router.push(`/profile/${user.userId}`)}
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
            <div className="text-center py-16 px-4">
              <MessageSquare className="w-10 h-10 mx-auto text-[var(--color-on-surface-variant)] mb-3" />
              <p className="font-semibold text-[var(--color-on-surface-variant)] text-sm">No conversations yet</p>
              <p className="text-xs text-[var(--color-outline-variant)] mt-1">Search users above to start messaging!</p>
            </div>
          ) : (
            conversations.map((c) => {
              const active = activeId === c.id;
              const hasUnread =
                c.lastMessage &&
                c.lastMessage.senderId !== userId &&
                !c.lastMessage.readAt;

              const timeDisplay = c.lastMessage
                ? formatDistanceToNowStrict(new Date(c.lastMessage.sentAt), { addSuffix: false })
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
                      {c.otherUser?.avatarUrl ? (
                        <img src={c.otherUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        c.otherUser?.username?.[0]?.toUpperCase() || '?'
                      )}
                    </div>
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-sm truncate max-w-[150px]
                        ${hasUnread ? 'font-bold text-[var(--color-on-surface)]' : 'font-semibold text-[var(--color-on-surface)]'}`}
                      >
                        {c.otherUser?.displayName || c.otherUser?.username || 'Unknown User'}
                      </span>
                      <span className={`text-[10px] flex-shrink-0 ${hasUnread ? 'text-[var(--color-primary)] font-bold' : 'text-[var(--color-on-surface-variant)]'}`}>
                        {timeDisplay}
                      </span>
                    </div>

                    <p className={`text-xs truncate
                      ${hasUnread ? 'font-bold text-[var(--color-on-surface)]' : 'text-[var(--color-on-surface-variant)]'}`}
                    >
                      {c.lastMessage
                        ? `${c.lastMessage.senderId === userId ? 'You: ' : ''}${c.lastMessage.content}`
                        : 'No messages yet'}
                    </p>
                  </div>

                  {hasUnread && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)] flex-shrink-0" />
                  )}
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
