"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import {
  Search,
  Loader2,
  MessageSquare,
  UserPlus,
  UserCheck,
  Clock
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../../store/authStore";

export default function ExplorePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [connections, setConnections] = useState<Record<string, { status: string, isSender: boolean }>>({});
  const [defaultExperts, setDefaultExperts] = useState<any[]>([]);
  
  const router = useRouter();
  const { userId } = useAuthStore();

  useEffect(() => {
    const loadConnections = async () => {
      if (!userId) return;
      const { data } = await supabase
        .from("user_connections")
        .select("sender_id, receiver_id, status")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
      
      if (data) {
        const connMap: Record<string, { status: string, isSender: boolean }> = {};
        data.forEach(conn => {
          const isSender = conn.sender_id === userId;
          const otherId = isSender ? conn.receiver_id : conn.sender_id;
          connMap[otherId] = { status: conn.status, isSender };
        });
        setConnections(connMap);
      }
    };
    loadConnections();
  }, [userId]);

  useEffect(() => {
    const loadExperts = async () => {
      if (!userId) return;
      const { data } = await supabase
        .from("users")
        .select("*")
        .neq("id", userId)
        .limit(20);

      if (data) {
        setDefaultExperts(data);
      }
    };
    loadExperts();
  }, [userId]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);

    try {
      const safeQuery = query.replace(/[%_\\]/g, '');
      if (safeQuery.length < 1) return;

      const { data } = await supabase
        .from("users")
        .select("*")
        .or(`username.ilike.%${safeQuery}%,display_name.ilike.%${safeQuery}%`)
        .limit(20);

      setResults(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectAction = async (targetUserId: string, action: 'add' | 'cancel' | 'accept' | 'remove') => {
    if (!userId) return;
    
    // Optimistic update
    setConnections(prev => {
      const next = { ...prev };
      if (action === 'add') next[targetUserId] = { status: 'pending', isSender: true };
      else if (action === 'accept') next[targetUserId] = { status: 'connected', isSender: prev[targetUserId]?.isSender || false };
      else delete next[targetUserId];
      return next;
    });

    try {
      if (action === 'add') {
        await supabase.from("user_connections").insert({ sender_id: userId, receiver_id: targetUserId, status: "pending" });
      } else if (action === 'cancel' || action === 'remove') {
        await supabase.from("user_connections").delete().or(`and(sender_id.eq.${userId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${userId})`);
      } else if (action === 'accept') {
        await supabase.from("user_connections").update({ status: 'connected' }).eq('sender_id', targetUserId).eq('receiver_id', userId);
      }
    } catch (error) {
      console.error("Error updating connection:", error);
    }
  };

  return (
    <div className="max-w-[1000px] mx-auto py-8 px-4 space-y-8 select-none lg:ml-64">
      {/* Search Header Section */}
      <section className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[var(--color-primary)]">
            Discover
          </h1>
          <p className="text-sm text-[var(--color-on-surface-variant)] max-w-xl">
            Find people, communities, and conversations that matter to you. All
            end-to-end encrypted and safe.
          </p>
        </div>

        {/* Prominent Search Bar */}
        <form onSubmit={handleSearch} className="relative group">
          <div className="absolute inset-0 bg-[var(--color-primary)]/5 rounded-2xl blur-xl group-focus-within:bg-[var(--color-primary)]/10 transition-all duration-500 pointer-events-none"></div>
          <div className="relative flex items-center bg-white border border-[var(--color-outline-variant)] focus-within:border-[var(--color-primary)] rounded-2xl shadow-sm transition-all duration-300 overflow-hidden">
            <Search className="ml-5 text-[var(--color-on-surface-variant)] w-6 h-6 flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, @username, or bio..."
              className="w-full bg-transparent border-none py-5 px-3 text-sm focus:ring-0 placeholder-[var(--color-on-surface-variant)]/50 text-[var(--color-on-surface)] outline-none"
            />
            <div className="mr-3 flex items-center gap-2 flex-shrink-0">
              <span className="hidden sm:inline text-[9px] font-bold text-[var(--color-on-surface-variant)] px-2 py-1 bg-[var(--color-surface-container)] rounded-lg">
                ⌘ K
              </span>
              <button
                type="submit"
                className="btn-primary px-5 py-2.5 flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Search"
                )}
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Suggested Experts Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--color-on-surface)]">
            {query.trim() && results.length > 0
              ? "Search Results"
              : "Suggested Users"}
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="glass-card p-6 rounded-3xl flex flex-col items-center space-y-4 animate-pulse"
              >
                <div className="w-20 h-20 rounded-[24px] bg-[var(--color-surface-container)]"></div>
                <div className="w-3/4 h-5 rounded bg-[var(--color-surface-container)]"></div>
                <div className="w-1/2 h-3.5 rounded bg-[var(--color-surface-container)]"></div>
                <div className="w-full h-9 rounded-xl bg-[var(--color-surface-container)] mt-2"></div>
              </div>
            ))}
          </div>
        ) : query.trim() && results.length === 0 ? (
          <div className="text-center py-12 glass-card rounded-3xl">
            <span className="text-3xl">🔍</span>
            <p className="text-sm font-semibold text-[var(--color-on-surface)] mt-3">
              No profiles matched your search
            </p>
            <p className="text-xs text-[var(--color-on-surface-variant)] mt-1">
              Try another query or check spelling
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(results.length > 0 ? results : defaultExperts).map((user) => {
              const conn = connections[user.id];
              const isDefault = user.id.startsWith("default-");

              return (
                <div
                  key={user.id}
                  className="glass-card p-6 rounded-3xl flex flex-col items-center text-center space-y-4 hover:shadow-md transition-shadow group relative"
                >
                  <div
                    className="relative cursor-pointer"
                    onClick={() =>
                      !isDefault && router.push(`/profile/${user.id}`)
                    }
                  >
                    <div className="w-20 h-20 rounded-[24px] overflow-hidden rotate-3 group-hover:rotate-0 transition-transform duration-300 bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)]">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-lg text-[var(--color-on-surface)] bg-[var(--color-surface-container)]">
                          {user.username?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                    </div>

                  </div>

                  <div
                    className="cursor-pointer"
                    onClick={() =>
                      !isDefault && router.push(`/profile/${user.id}`)
                    }
                  >
                    <h3 className="font-bold text-sm text-[var(--color-on-surface)] group-hover:text-[var(--color-primary)] transition-colors leading-tight">
                      {user.display_name || user.username}
                    </h3>
                    <p className="text-[10px] font-semibold text-[var(--color-on-surface-variant)] mt-0.5">
                      @{user.username}
                    </p>
                  </div>

                  <p className="text-xs text-[var(--color-on-surface-variant)] line-clamp-2 h-8 leading-relaxed">
                    {user.bio || "No bio provided yet."}
                  </p>

                  <div className="w-full flex gap-2">
                    {!conn || conn.status === 'none' ? (
                      <button
                        onClick={() => handleConnectAction(user.id, 'add')}
                        className="flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer btn-primary flex items-center justify-center gap-1.5"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Add Friend
                      </button>
                    ) : conn.status === 'pending' && conn.isSender ? (
                      <button
                        onClick={() => handleConnectAction(user.id, 'cancel')}
                        className="flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer bg-[var(--color-surface-container)] text-[var(--color-on-surface)] border border-[var(--color-outline-variant)] flex items-center justify-center gap-1.5"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Requested
                      </button>
                    ) : conn.status === 'pending' && !conn.isSender ? (
                      <>
                        <button
                          onClick={() => handleConnectAction(user.id, 'accept')}
                          className="flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer btn-primary flex items-center justify-center gap-1"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Accept
                        </button>
                        <button
                          onClick={() => handleConnectAction(user.id, 'remove')}
                          className="flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer bg-[var(--color-surface-container)] text-[var(--color-on-surface)] border border-[var(--color-outline-variant)]"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleConnectAction(user.id, 'remove')}
                        className="flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer bg-[var(--color-surface-container)] text-[var(--color-on-surface)] border border-[var(--color-outline-variant)] flex items-center justify-center gap-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Friends
                      </button>
                    )}
                    
                    {!isDefault && (
                      <button
                        onClick={async () => {
                          if (!userId) return;
                          try {
                            const { data: myMemberships } = await supabase
                              .from("conversation_members")
                              .select("conversation_id")
                              .eq("user_id", userId);
                            const convIds = (myMemberships || []).map((m) => m.conversation_id);
                            let conversationId = null;
                            if (convIds.length > 0) {
                              const { data: commonConv } = await supabase
                                .from("conversation_members")
                                .select("conversation_id")
                                .in("conversation_id", convIds)
                                .eq("user_id", user.id)
                                .limit(1)
                                .maybeSingle();
                              conversationId = commonConv?.conversation_id;
                            }
                            if (!conversationId) {
                              const newConvId = crypto.randomUUID();
                              await supabase
                                .from("conversations")
                                .insert({ id: newConvId, type: "direct", created_by: userId });
                              conversationId = newConvId;
                              await supabase.from("conversation_members").insert([
                                { conversation_id: conversationId, user_id: userId },
                                { conversation_id: conversationId, user_id: user.id }
                              ]);
                            }
                            router.push(`/messages/${conversationId}`);
                          } catch (err) {
                            console.error("Error starting conversation:", err);
                          }
                        }}
                        className="p-2 border border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] rounded-xl transition-all cursor-pointer flex items-center justify-center"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
