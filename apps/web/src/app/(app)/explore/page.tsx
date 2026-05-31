"use client";

import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Search, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ExplorePage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(20);

    setResults(data || []);
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-guff-text)] mb-6">Explore</h1>

      <form onSubmit={handleSearch} className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-guff-text-muted)]" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search users..."
          className="input-field pl-12 py-3"
        />
        {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-guff-primary)] animate-spin" />}
      </form>

      <div className="space-y-2">
        {results.map(user => (
          <button
            key={user.id}
            onClick={() => router.push(`/profile/${user.id}`)}
            className="w-full card flex items-center gap-3 p-4 hover:shadow-[var(--shadow-card-hover)] transition-all text-left"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                user.username?.[0]?.toUpperCase() || '?'
              )}
            </div>
            <div>
              <div className="font-semibold text-sm text-[var(--color-guff-text)]">
                {user.display_name || user.username}
              </div>
              <div className="text-xs text-[var(--color-guff-text-muted)]">@{user.username}</div>
              {user.bio && <p className="text-xs text-[var(--color-guff-text-secondary)] mt-1 line-clamp-1">{user.bio}</p>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
