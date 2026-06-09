"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useAuthStore } from "../../../store/authStore";
import Link from "next/link";
import { Check, X, UserMinus, ShieldCheck } from "lucide-react";

export default function ConnectionsPage() {
  const { userId } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'requests' | 'connections'>('requests');
  const [requests, setRequests] = useState<Record<string, unknown>[]>([]);
  const [connections, setConnections] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadConnections();
    }
  }, [userId]);

  const loadConnections = async () => {
    setLoading(true);
    try {
      // Load pending requests (where I am the receiver)
      const { data: reqData } = await supabase
        .from('user_connections')
        .select(`
          id,
          sender_id,
          status,
          created_at,
          users!user_connections_sender_id_fkey(id, username, display_name, avatar_url)
        `)
        .eq('receiver_id', userId)
        .eq('status', 'pending');
        
      if (reqData) setRequests(reqData);

      // Load accepted connections
      const { data: connData } = await supabase
        .from('user_connections')
        .select(`
          id,
          sender_id,
          receiver_id,
          status,
          sender:users!user_connections_sender_id_fkey(id, username, display_name, avatar_url),
          receiver:users!user_connections_receiver_id_fkey(id, username, display_name, avatar_url)
        `)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq('status', 'accepted');
        
      if (connData) {
        // Map to standard format
        const formattedConns = connData.map((c: Record<string, unknown>) => {
          const otherUser = c.sender_id === userId ? c.receiver : c.sender;
          return {
            id: c.id,
            user: otherUser
          };
        });
        setConnections(formattedConns);
      }
    } catch (err) {
      console.error("Failed to load connections:", err);
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (id: string) => {
    try {
      await supabase.from('user_connections').update({ status: 'accepted' }).eq('id', id);
      setRequests(requests.filter(r => r.id !== id));
      loadConnections(); // Reload to update connections list
    } catch (err) {
      console.error("Error accepting request:", err);
    }
  };

  const rejectRequest = async (id: string) => {
    try {
      await supabase.from('user_connections').delete().eq('id', id);
      setRequests(requests.filter(r => r.id !== id));
    } catch (err) {
      console.error("Error rejecting request:", err);
    }
  };

  const removeConnection = async (id: string) => {
    try {
      await supabase.from('user_connections').delete().eq('id', id);
      setConnections(connections.filter(c => c.id !== id));
    } catch (err) {
      console.error("Error removing connection:", err);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-10"><span className="material-symbols-outlined animate-spin text-[var(--color-primary)]">sync</span></div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-20">
      <h1 className="text-2xl font-bold text-[var(--color-on-surface)] mb-6 flex items-center gap-2">
        <ShieldCheck className="w-6 h-6 text-[var(--color-primary)]" />
        Connections
      </h1>

      <div className="flex gap-4 border-b border-[var(--color-outline-variant)] mb-6">
        <button
          onClick={() => setActiveTab('requests')}
          className={`pb-2 text-sm font-bold transition-all border-b-2 ${
            activeTab === 'requests'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'
          }`}
        >
          Requests {requests.length > 0 && <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{requests.length}</span>}
        </button>
        <button
          onClick={() => setActiveTab('connections')}
          className={`pb-2 text-sm font-bold transition-all border-b-2 ${
            activeTab === 'connections'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'
          }`}
        >
          My Connections
        </button>
      </div>

      <div>
        {activeTab === 'requests' && (
          <div className="space-y-4">
            {requests.length === 0 ? (
              <div className="text-center py-10 text-[var(--color-on-surface-variant)]">
                <p>No pending connection requests.</p>
              </div>
            ) : (
              requests.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-4 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)]">
                  <Link href={`/profile/${req.users.id}`} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-[var(--color-surface-container)]">
                      {req.users.avatar_url ? (
                        <img src={req.users.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl font-bold bg-[var(--color-primary-container)] text-[var(--color-primary)]">
                          {req.users.username?.[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-[var(--color-on-surface)]">{req.users.display_name || req.users.username}</p>
                      <p className="text-sm text-[var(--color-on-surface-variant)]">@{req.users.username}</p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => acceptRequest(req.id)}
                      className="p-2 rounded-full bg-[var(--color-primary)] text-white hover:opacity-90 transition-all"
                      title="Accept"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => rejectRequest(req.id)}
                      className="p-2 rounded-full bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] hover:bg-[var(--color-error-container)] hover:text-[var(--color-on-error-container)] transition-all"
                      title="Reject"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'connections' && (
          <div className="space-y-4">
            {connections.length === 0 ? (
              <div className="text-center py-10 text-[var(--color-on-surface-variant)]">
                <p>You don't have any connections yet.</p>
              </div>
            ) : (
              connections.map((conn) => (
                <div key={conn.id} className="flex items-center justify-between p-4 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)]">
                  <Link href={`/profile/${conn.user.id}`} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-[var(--color-surface-container)]">
                      {conn.user.avatar_url ? (
                        <img src={conn.user.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl font-bold bg-[var(--color-primary-container)] text-[var(--color-primary)]">
                          {conn.user.username?.[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-[var(--color-on-surface)]">{conn.user.display_name || conn.user.username}</p>
                      <p className="text-sm text-[var(--color-on-surface-variant)]">@{conn.user.username}</p>
                    </div>
                  </Link>
                  <button
                    onClick={() => removeConnection(conn.id)}
                    className="p-2 rounded-full bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] hover:bg-[var(--color-error-container)] hover:text-[var(--color-on-error-container)] transition-all"
                    title="Remove Connection"
                  >
                    <UserMinus className="w-5 h-5" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
