"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { CreatePost } from '../../../components/CreatePost';
import { PostCard } from '../../../components/PostCard';
import { StoriesTray } from '../../../components/StoriesTray';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { Post, Session, User } from '../../../types';

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<User | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setSession(session);

      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
      setProfile(profileData);

      await fetchPosts(session);
    };
    init();
  }, []);

  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());

  async function fetchPosts(providedSession?: Session | null) {
    const activeSession = providedSession || session;
    setLoading(true);
    try {
      if (activeSession) {
        const { data: followsData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', activeSession.user.id);
        
        const followedIds = followsData ? followsData.map(f => f.following_id) : [];
        followedIds.push(activeSession.user.id);

        const { data, error } = await supabase
          .from('posts')
          .select('*, users:author_id(id, username, display_name, avatar_url), likes(count), comments(count), post_shares(count)')
          .in('author_id', followedIds)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        if (data) {
          setPosts(data);

          // Batch-fetch user-specific like/save status in 2 queries (not 2 per card)
          const postIds = data.map(p => p.id);
          if (postIds.length > 0) {
            const [likesRes, savesRes] = await Promise.all([
              supabase
                .from('likes')
                .select('post_id')
                .eq('user_id', activeSession.user.id)
                .in('post_id', postIds),
              supabase
                .from('saved_posts')
                .select('post_id')
                .eq('user_id', activeSession.user.id)
                .in('post_id', postIds),
            ]);

            setLikedPostIds(new Set((likesRes.data || []).map(l => l.post_id)));
            setSavedPostIds(new Set((savesRes.data || []).map(s => s.post_id)));
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err);
      toast.error('Could not load feed. Please refresh.');
    } finally {
      setLoading(false);
    }
  };


  if (!session) return null;

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 md:py-8 lg:ml-64">
      {/* Header */}
      <div className="mb-6 select-none">
        <h1 className="text-headline-lg font-bold text-[var(--color-on-surface)] font-display-lg tracking-tight">Feed</h1>
        <p className="text-body-sm text-[var(--color-on-surface-variant)] mt-1">See what's happening securely</p>
      </div>

      {/* Stories Tray */}
      <div className="mb-6 p-4 glass-card rounded-3xl overflow-hidden">
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
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card rounded-3xl p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[var(--color-surface-container-highest)]" />
                <div className="space-y-2">
                  <div className="h-4 bg-[var(--color-surface-container-highest)] rounded w-24" />
                  <div className="h-3 bg-[var(--color-surface-container-highest)] rounded w-16" />
                </div>
              </div>
              <div className="h-20 bg-[var(--color-surface-container-highest)] rounded-xl mb-4" />
              <div className="flex gap-4">
                <div className="h-8 w-16 bg-[var(--color-surface-container-highest)] rounded-full" />
                <div className="h-8 w-16 bg-[var(--color-surface-container-highest)] rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 glass-card rounded-3xl">
          <div className="text-4xl mb-3">📝</div>
          <h3 className="font-semibold text-[var(--color-on-surface)]">No posts yet</h3>
          <p className="text-xs text-[var(--color-on-surface-variant)] mt-1">Be the first to share something!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={session.user.id}
              isLiked={likedPostIds.has(post.id)}
              isSaved={savedPostIds.has(post.id)}
              onDelete={fetchPosts}
            />
          ))}
        </div>
      )}
    </div>
  );
}
