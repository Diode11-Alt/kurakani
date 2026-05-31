"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { usePathname, useRouter } from 'next/navigation';
import { formatDistanceToNowStrict } from 'date-fns';
import { Search, MessageSquare, Loader2 } from 'lucide-react';

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [session, setSession] = useState<any>(null);

  const pathname = usePathname();
  const router = useRouter();

  // Extract selected conversation ID if we are in /messages/[id]
  const pathParts = pathname.split('/');
  const activeId = pathParts.length > 2 && pathParts[1] === 'messages' ? pathParts[2] : null;

  useEffect(() => {
    const init = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) return;
      setSession(currentSession);
      await loadConversations(currentSession.user.id);
      setLoading(false);
    };

    init();

    // Subscribe to new conversations or updates
    const channel = supabase
      .channel('messages-layout-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        async () => {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession) {
            await loadConversations(currentSession.user.id);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async () => {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession) {
            await loadConversations(currentSession.user.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pathname]);

  const loadConversations = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          last_message_at,
          p1:participant_1(id, username, display_name, avatar_url),
          p2:participant_2(id, username, display_name, avatar_url)
        `)
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      if (!data) return;

      const enriched = await Promise.all(
        data.map(async (c: any) => {
          // Identify other participant
          const otherUser = c.p1.id === userId ? c.p2 : c.p1;

          // Fetch last message
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content, sender_id, created_at, read_at')
            .eq('conversation_id', c.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            id: c.id,
            last_message_at: c.last_message_at,
            otherUser,
            lastMessage: lastMsg || null,
          };
        })
      );

      // Sort by last message / active timestamp descending
      enriched.sort((a, b) => {
        const timeA = new Date(a.lastMessage?.created_at || a.last_message_at).getTime();
        const timeB = new Date(b.lastMessage?.created_at || b.last_message_at).getTime();
        return timeB - timeA;
      });

      setConversations(enriched);
    } catch (err) {
      console.error('Error loading conversations:', err);
    }
  };

  // Live search users to message
  useEffect(() => {
    if (!searchQuery.trim() || !session) {
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setSearching(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .neq('id', session.user.id)
          .ilike('username', `%${searchQuery.trim()}%`)
          .limit(5);

        if (!error && data) {
          setSearchResults(data);
        }
      } catch (err) {
        console.error('Error searching profiles:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, session]);

  const startConversation = async (otherUserId: string) => {
    if (!session) return;
    setSearchQuery('');
    setSearchResults([]);
    try {
      const { data, error } = await supabase.rpc('get_or_create_conversation', {
        user_a: session.user.id,
        user_b: otherUserId,
      });

      if (error) throw error;
      if (data) {
        router.push(`/messages/${data}`);
      }
    } catch (err) {
      console.error('Error creating conversation:', err);
      alert('Failed to start conversation');
    }
  };

  const isInboxRoute = pathname === '/messages';

  return (
    <div className="flex w-full h-[calc(100vh-64px)] md:h-screen overflow-hidden bg-[var(--color-guff-surface)]">
      {/* Sidebar pane: Hidden on mobile if thread is active */}
      <div
        className={`w-full md:w-[360px] border-r border-[var(--color-guff-border)] flex flex-col flex-shrink-0 bg-white
          ${!isInboxRoute ? 'hidden md:flex' : 'flex'}`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-[var(--color-guff-border)]">
          <h1 className="text-xl font-extrabold text-[var(--color-guff-text)] mb-3">Chats</h1>
          
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-guff-text-muted)]" />
            <input
              type="text"
              placeholder="Search people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-9 text-sm py-2 bg-slate-50 border-none focus:bg-white"
            />
          </div>

          {/* Search Results Dropdown */}
          {searchQuery.trim() !== '' && (
            <div className="absolute left-4 right-4 md:left-auto md:w-[328px] mt-1 bg-white rounded-xl shadow-xl border border-[var(--color-guff-border)] py-2 z-50 max-h-[250px] overflow-y-auto">
              {searching ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--color-guff-primary)]" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-4 text-xs text-[var(--color-guff-text-muted)]">No users found</div>
              ) : (
                searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => startConversation(user.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold overflow-hidden text-xs">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        user.username[0].toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-[var(--color-guff-text)]">
                        {user.display_name || user.username}
                      </div>
                      <div className="text-xs text-[var(--color-guff-text-muted)]">@{user.username}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--color-guff-primary)]" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-16 px-4">
              <MessageSquare className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p className="font-semibold text-[var(--color-guff-text-secondary)] text-sm">No conversations yet</p>
              <p className="text-xs text-[var(--color-guff-text-muted)] mt-1">Search users above to start messaging!</p>
            </div>
          ) : (
            conversations.map((c) => {
              const active = activeId === c.id;
              const hasUnread =
                c.lastMessage &&
                c.lastMessage.sender_id !== session?.user?.id &&
                !c.lastMessage.read_at;

              // Format date strictly
              const timeDisplay = c.lastMessage
                ? formatDistanceToNowStrict(new Date(c.lastMessage.created_at), { addSuffix: false })
                    .replace(' seconds', 's')
                    .replace(' second', 's')
                    .replace(' minutes', 'm')
                    .replace(' minute', 'm')
                    .replace(' hours', 'h')
                    .replace(' hour', 'h')
                    .replace(' days', 'd')
                    .replace(' day', 'd')
                    .replace(' ago', '')
                : '';

              return (
                <button
                  key={c.id}
                  onClick={() => router.push(`/messages/${c.id}`)}
                  className={`w-full flex items-center gap-3 p-4 text-left transition-colors
                    ${active ? 'bg-[var(--color-guff-primary-light)]/40' : 'hover:bg-slate-50'}`}
                >
                  {/* Avatar */}
                  <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden">
                    {c.otherUser.avatar_url ? (
                      <img src={c.otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      c.otherUser.username?.[0]?.toUpperCase() || '?'
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-sm truncate max-w-[150px]
                        ${hasUnread ? 'font-bold text-[var(--color-guff-text)]' : 'font-semibold text-[var(--color-guff-text)]'}`}
                      >
                        {c.otherUser.display_name || c.otherUser.username}
                      </span>
                      <span className="text-[11px] text-[var(--color-guff-text-muted)] flex-shrink-0">{timeDisplay}</span>
                    </div>

                    <p className={`text-xs truncate
                      ${hasUnread ? 'font-bold text-[var(--color-guff-text)]' : 'text-[var(--color-guff-text-secondary)]'}`}
                    >
                      {c.lastMessage
                        ? `${c.lastMessage.sender_id === session?.user?.id ? 'You: ' : ''}${c.lastMessage.content}`
                        : 'No messages yet'}
                    </p>
                  </div>

                  {/* Unread indicator */}
                  {hasUnread && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-guff-primary)] flex-shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Detail pane */}
      <div className={`flex-1 flex flex-col h-full bg-slate-50
        ${isInboxRoute ? 'hidden md:flex' : 'flex'}`}
      >
        {children}
      </div>
    </div>
  );
}
