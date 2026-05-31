"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { CreatePost } from '../../../components/CreatePost';
import { PostCard } from '../../../components/PostCard';
import { StoriesTray } from '../../../components/StoriesTray';
import { Loader2 } from 'lucide-react';

export default function FeedPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setSession(session);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      setProfile(profileData);

      await fetchPosts();
    };
    init();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles:author_id(id, username, display_name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setPosts(data);
    }
    setLoading(false);
  };

  if (!session) return null;

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-guff-text)]">Feed</h1>
        <p className="text-sm text-[var(--color-guff-text-muted)] mt-1">See what's happening</p>
      </div>

      {/* Stories Tray */}
      <div className="mb-6 card p-4 overflow-hidden">
        <StoriesTray
          currentUserId={session.user.id}
          currentProfile={profile}
        />
      </div>

      {/* Create Post */}
      <div className="mb-6">
        <CreatePost
          userId={session.user.id}
          userProfile={profile}
          onPostCreated={fetchPosts}
        />
      </div>

      {/* Posts */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--color-guff-primary)]" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📝</div>
          <h3 className="font-semibold text-[var(--color-guff-text)]">No posts yet</h3>
          <p className="text-sm text-[var(--color-guff-text-muted)] mt-1">Be the first to share something!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={session.user.id}
              onDelete={fetchPosts}
            />
          ))}
        </div>
      )}
    </div>
  );
}
