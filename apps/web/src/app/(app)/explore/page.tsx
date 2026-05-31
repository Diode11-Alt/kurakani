"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Search, Loader2, ShieldCheck, Check, Terminal, Brain, Eye, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ExplorePage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [followedUserIds, setFollowedUserIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  // Mock initial suggested experts for a premium look when query is empty
  const defaultExperts = [
    {
      id: 'default-1',
      username: 'julian_v',
      display_name: 'Julian Vane',
      bio: 'Cryptography enthusiast and lead developer of the OpenShield project. Exploring private networks.',
      avatar_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDomovHpSqPQzN_s8PrIqjahg8GRBJGBRX6VC5jbAgOoVgeUpETslSNOO6Y0Ll0RiyhRL4dhH7QBIqfUhELn7I1TeqaYnT6ZEVhURQD04GCUi-siFDIW3BcedYncmXNfQcspjB8D8RBVSB852e-FRcmKGBB8MK4diLkQBiRIGmLKNL1l0s27QuvbF9k-IAAvCkYozKRLY-bLvO2zxN9hfJ4OMw07ncf5d6_CD2yHur_YfSGIYXih2nGJ3V5_mZwEwP6V5gk4vI_-HEq',
      verified: true
    },
    {
      id: 'default-2',
      username: 'erossi_design',
      display_name: 'Elena Rossi',
      bio: "Visual designer focused on human-centric communication systems. Currently building GUFF's icon library.",
      avatar_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDoR1LGQZNbs7FpalYIJFQwwVqJCFVsbH9vZZ1khs9c_XM4s0_sgoztgq3kyZGnentp9d2JjFWxon97SAlg1uBaOrKdIyGjHUVgUbFpCIojQ0qFdw87HgvQn9kl_-pY6l7TRkSaq6AMzAu_zZkEDsgngaqCZj4gk9tHYdQYNs1TN05VOcD8YR6QGBKbJ3AkqzFjUw2gx88I0wS6VjbGF9CaSP_U3KE2prliO6uxlcatMtQVDCgraovkiu-o3zfLqXmm7zUgH2S2W8OK',
      verified: false
    },
    {
      id: 'default-3',
      username: 'mchen_secure',
      display_name: 'Mark Chen',
      bio: 'Security auditor. I find the holes so others don\'t. ☕ Coffee and zero-knowledge proofs.',
      avatar_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC8qFpIfWkunOEhNeVne1C69cIOP_e-iTzc8MYTgvSHGds_LyhDkWhWEbMKul8IXTC6oVs47EkjXm6slLc_OEPm4jjxJygDHY_D4YDjAtVl3B4xletEBEMHXnLq601LyoqOZct01-JLoLCrVCAWU2vbQzF5PWJZdnvgfpGxjK9v9UFOwXUdcJO0DVToA3HsDVv9LLsmCEHbvfgAKsT69_a1X7lEYKMifDh_pWBU6V2nobiJbnhRSjE5qcnffCI80BcvBEq_NWxtck3U',
      verified: true
    }
  ];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);

    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(20);

      setResults(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = (id: string) => {
    setFollowedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="max-w-[1000px] mx-auto py-8 px-4 space-y-8 select-none">
      {/* Search Header Section */}
      <section className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[var(--color-guff-primary)]">Discover</h1>
          <p className="text-sm text-[var(--color-guff-text-secondary)] max-w-xl">
            Find people, communities, and conversations that matter to you. All end-to-end encrypted and safe.
          </p>
        </div>

        {/* Prominent Search Bar */}
        <form onSubmit={handleSearch} className="relative group">
          <div className="absolute inset-0 bg-[var(--color-guff-primary)]/5 rounded-2xl blur-xl group-focus-within:bg-[var(--color-guff-primary)]/10 transition-all duration-500 pointer-events-none"></div>
          <div className="relative flex items-center bg-[#1C1816] border border-[#4A3D33] focus-within:border-brand rounded-2xl shadow-sm transition-all duration-300 overflow-hidden">
            <Search className="ml-5 text-[var(--color-guff-text-muted)] w-6 h-6 flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, @username, or bio..."
              className="w-full bg-transparent border-none py-5 px-3 text-sm focus:ring-0 placeholder-[var(--color-guff-text-muted)]/50 text-[var(--color-guff-text)] outline-none"
            />
            <div className="mr-3 flex items-center gap-2 flex-shrink-0">
              <span className="hidden sm:inline text-[9px] font-bold text-[var(--color-guff-text-muted)] px-2 py-1 bg-[var(--color-guff-surface-container)] rounded-lg">⌘ K</span>
              <button 
                type="submit" 
                className="bg-[var(--color-guff-primary)] hover:bg-[var(--color-guff-primary-hover)] text-white text-xs font-bold px-5 py-2.5 rounded-xl active:scale-95 transition-all cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
              </button>
            </div>
          </div>
        </form>

        {/* Trending Pills */}
        <div className="flex flex-wrap items-center gap-2.5 select-none">
          <span className="text-[10px] font-bold text-[var(--color-guff-text-muted)] uppercase tracking-wider">Trending:</span>
          {['#privacy', '#blockchain', '#design', '#tech', '#open_source', '#security'].map(tag => (
            <button
              key={tag}
              onClick={() => { setQuery(tag.replace('#', '')); }}
              className="px-3.5 py-1.5 rounded-full bg-[var(--color-guff-surface-container)] text-[var(--color-guff-text-secondary)] font-bold text-xs hover:bg-[var(--color-guff-primary-light)] hover:text-[var(--color-guff-primary)] transition-all cursor-pointer"
            >
              {tag}
            </button>
          ))}
        </div>
      </section>

      {/* Suggested Experts Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--color-guff-text)]">
            {query.trim() && results.length > 0 ? 'Search Results' : 'Suggested Experts'}
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="card-ember p-6 rounded-2xl flex flex-col items-center space-y-4 animate-pulse">
                <div className="w-20 h-20 rounded-[24px] bg-[#262220]"></div>
                <div className="w-3/4 h-5 rounded bg-[#262220]"></div>
                <div className="w-1/2 h-3.5 rounded bg-[#262220]"></div>
                <div className="w-full h-9 rounded-xl bg-[#262220] mt-2"></div>
              </div>
            ))}
          </div>
        ) : query.trim() && results.length === 0 ? (
          <div className="text-center py-12 card-ember rounded-2xl">
            <span className="text-3xl">🔍</span>
            <p className="text-sm font-semibold text-[var(--color-guff-text)] mt-3">No profiles matched your search</p>
            <p className="text-xs text-[var(--color-guff-text-muted)] mt-1">Try another query or check spelling</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(results.length > 0 ? results : defaultExperts).map((user) => {
              const following = followedUserIds.has(user.id);
              const isDefault = user.id.startsWith('default-');

              return (
                <div 
                  key={user.id} 
                  className="card-ember p-6 rounded-2xl flex flex-col items-center text-center space-y-4 hover:shadow-md transition-shadow group relative"
                >
                  <div className="relative cursor-pointer" onClick={() => !isDefault && router.push(`/profile/${user.id}`)}>
                    <div className="w-20 h-20 rounded-[24px] overflow-hidden rotate-3 group-hover:rotate-0 transition-transform duration-300 bg-[#262220] border border-[#4A3D33]">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-lg text-content bg-[#262220]">
                          {user.username?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                    {user.verified !== false && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand rounded-full border-4 border-[#1C1816] flex items-center justify-center shadow ember-glow-sm">
                        <Check className="w-3 h-3 text-white stroke-[4]" />
                      </div>
                    )}
                  </div>

                  <div className="cursor-pointer" onClick={() => !isDefault && router.push(`/profile/${user.id}`)}>
                    <h3 className="font-bold text-sm text-[var(--color-guff-text)] group-hover:text-[var(--color-guff-primary)] transition-colors leading-tight">
                      {user.display_name || user.username}
                    </h3>
                    <p className="text-[10px] font-semibold text-[var(--color-guff-text-muted)] mt-0.5">@{user.username}</p>
                  </div>

                  <p className="text-xs text-[var(--color-guff-text-secondary)] line-clamp-2 h-8 leading-relaxed">
                    {user.bio || 'No bio provided yet.'}
                  </p>

                  <div className="w-full flex gap-2">
                    <button 
                      onClick={() => toggleFollow(user.id)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer ${
                        following
                          ? 'bg-[#262220] text-content border border-[#4A3D33]'
                          : 'bg-brand text-white hover:bg-brand-hover ember-glow-sm'
                      }`}
                    >
                      {following ? 'Following' : 'Follow'}
                    </button>
                    {!isDefault && (
                      <button 
                        onClick={async () => {
                          const { data: { session } } = await supabase.auth.getSession();
                          if (!session) return;
                          const { data } = await supabase.rpc('get_or_create_conversation', {
                            user_a: session.user.id,
                            user_b: user.id
                          });
                          if (data) router.push(`/messages/${data}`);
                        }}
                        className="p-2 border border-[#4A3D33] hover:bg-[#262220] text-content-secondary rounded-xl transition-all cursor-pointer"
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

      {/* Explore Channels Bento */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-[var(--color-guff-text)]">Explore Channels</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[160px] select-none">
          {/* Card 1 */}
          <div className="md:col-span-2 md:row-span-2 relative rounded-3xl overflow-hidden group cursor-pointer border border-[var(--color-guff-border)]/20 shadow-sm">
            <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCPjB-Qqo8AiNDSt2TLtBI7fdPM-nW2MA00OzSG3bZhJmsM5Y0QG0RwF1QG42oZe0427rtzkGfpgy7E8Oys0N3D7YOC_46GwaPmbhvODF__qI7SPwk_-AXulfKfWDG9ajjd0V3jz8phCWGa52CXA6nmfecf51iUAy3l5geDB-6KGfpB9MfoKnLS84keRMB4QkV9hwU0oZoZMs92pKveWcMT03BBhM3ClpS9NS7WlvZcX2Up0gdxd6VHjQAv8VMcwSReSgP7lbVEcev6" alt="Cybersecurity" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 flex flex-col justify-end">
              <h4 className="text-white font-bold text-lg">Cybersecurity News</h4>
              <p className="text-white/80 text-xs mt-1">2.4k members active now</p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="md:col-span-2 relative rounded-3xl overflow-hidden group cursor-pointer border border-[var(--color-guff-border)]/20 shadow-sm">
            <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDhE9ulFk_cxZI5i-q8-5uUyTV4U0Nta-amgsEwT3T21-nwLrbevXQt0Eou6PgVog-LzyS90ItvyX4PyTssfDQpywX8b5gwi1nBN5jeSAEgwvtGfNT0j9HwBxepbn93hbR-HzV5JPOqzEUb4N6kC50C-f--I85PUBCi-g-JinTmLtCR4ZD6YGqrg009RE8wp3q_k2Zjj0XoWvCIII4dpAc6XYs7bXsVAnWO-OLe6KByYf-Ke4B0YMRtfL-rrxNPfAhleB0Z6fUm_vO8" alt="Design" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex flex-col justify-end">
              <h4 className="text-white font-bold text-sm">Product Design</h4>
            </div>
          </div>

          {/* Card 3 (Bento flat color) */}
          <div className="relative rounded-3xl overflow-hidden group cursor-pointer bg-[var(--color-guff-secondary-container)] border border-[var(--color-guff-border)]/20 shadow-sm hover:-translate-y-0.5 transition-transform duration-200">
            <div className="absolute inset-0 p-5 flex flex-col justify-between">
              <Terminal className="text-white w-9 h-9" />
              <div>
                <h4 className="text-white font-bold text-sm">Open Source</h4>
                <p className="text-white/80 text-[10px] mt-0.5">Join the sprint</p>
              </div>
            </div>
          </div>

          {/* Card 4 (Bento flat color) */}
          <div className="relative rounded-3xl overflow-hidden group cursor-pointer bg-[var(--color-guff-primary-container)] border border-[var(--color-guff-border)]/20 shadow-sm hover:-translate-y-0.5 transition-transform duration-200">
            <div className="absolute inset-0 p-5 flex flex-col justify-between">
              <Brain className="text-white w-9 h-9" />
              <div>
                <h4 className="text-white font-bold text-sm">AI Ethics</h4>
                <p className="text-white/80 text-[10px] mt-0.5">Debates & Updates</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
