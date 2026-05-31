"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { PostCard } from '../../../../components/PostCard';
import { Loader2, MapPin, LinkIcon, Calendar } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const profileId = params.id as string;

  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();
      setProfile(profileData);

      // Fetch posts
      const { data: postsData } = await supabase
        .from('posts')
        .select('*, profiles:author_id(id, username, display_name, avatar_url)')
        .eq('author_id', profileId)
        .order('created_at', { ascending: false });
      setPosts(postsData || []);

      // Fetch follow counts
      const { count: followers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profileId);
      setFollowersCount(followers || 0);

      const { count: following } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', profileId);
      setFollowingCount(following || 0);

      // Check if following
      if (session && session.user.id !== profileId) {
        const { data: followData } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', session.user.id)
          .eq('following_id', profileId)
          .maybeSingle();
        setIsFollowing(!!followData);
      }

      setLoading(false);
    };
    init();
  }, [profileId]);

  const toggleFollow = async () => {
    if (!session) return;
    if (isFollowing) {
      setIsFollowing(false);
      setFollowersCount(c => c - 1);
      await supabase.from('follows').delete()
        .eq('follower_id', session.user.id)
        .eq('following_id', profileId);
    } else {
      setIsFollowing(true);
      setFollowersCount(c => c + 1);
      await supabase.from('follows').insert({
        follower_id: session.user.id,
        following_id: profileId,
      });
    }
  };

  const handleMessage = async () => {
    if (!session) return;
    try {
      const { data, error } = await supabase.rpc('get_or_create_conversation', {
        user_a: session.user.id,
        user_b: profileId
      });
      if (error) throw error;
      if (data) {
        router.push(`/messages/${data}`);
      }
    } catch (err) {
      console.error('Error starting conversation:', err);
      alert('Failed to start conversation');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-guff-primary)]" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-[var(--color-guff-text)]">User not found</h2>
      </div>
    );
  }

  const isOwnProfile = session?.user?.id === profileId;

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      {/* Profile Header */}
      <div className="card overflow-hidden mb-6">
        {/* Cover */}
        <div className="h-36 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-400 relative">
          {profile.cover_url && (
            <img src={profile.cover_url} alt="" className="w-full h-full object-cover" />
          )}
        </div>

        {/* Info */}
        <div className="px-5 pb-5">
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="w-20 h-20 rounded-full border-4 border-white bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-2xl font-bold overflow-hidden shadow-lg">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                profile.username?.[0]?.toUpperCase() || '?'
              )}
            </div>

            {!isOwnProfile && session && (
              <div className="flex gap-2">
                <button
                  onClick={handleMessage}
                  className="px-5 py-2 rounded-xl text-sm font-semibold border border-[var(--color-guff-border)] bg-[var(--color-guff-surface)] text-[var(--color-guff-text-secondary)] hover:bg-slate-50 transition-all"
                >
                  Message
                </button>
                <button
                  onClick={toggleFollow}
                  className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isFollowing
                      ? 'bg-slate-100 text-[var(--color-guff-text)] hover:bg-red-50 hover:text-[var(--color-guff-danger)]'
                      : 'btn-primary'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>
            )}
          </div>

          <h1 className="text-xl font-extrabold text-[var(--color-guff-text)]">
            {profile.display_name || profile.username}
          </h1>
          <p className="text-sm text-[var(--color-guff-text-muted)]">@{profile.username}</p>

          {profile.bio && (
            <p className="text-sm text-[var(--color-guff-text-secondary)] mt-2 leading-relaxed">{profile.bio}</p>
          )}

          <div className="flex items-center gap-4 mt-3 text-sm text-[var(--color-guff-text-muted)]">
            {profile.website && (
              <span className="flex items-center gap-1">
                <LinkIcon className="w-3.5 h-3.5" />
                <a href={profile.website} target="_blank" rel="noopener" className="text-[var(--color-guff-primary)] hover:underline">
                  {profile.website.replace(/^https?:\/\//, '')}
                </a>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Joined {profile.created_at ? format(new Date(profile.created_at), 'MMM yyyy') : ''}
            </span>
          </div>

          <div className="flex items-center gap-5 mt-4 text-sm">
            <span>
              <span className="font-bold text-[var(--color-guff-text)]">{followingCount}</span>{' '}
              <span className="text-[var(--color-guff-text-muted)]">Following</span>
            </span>
            <span>
              <span className="font-bold text-[var(--color-guff-text)]">{followersCount}</span>{' '}
              <span className="text-[var(--color-guff-text-muted)]">Followers</span>
            </span>
            <span>
              <span className="font-bold text-[var(--color-guff-text)]">{posts.length}</span>{' '}
              <span className="text-[var(--color-guff-text-muted)]">Posts</span>
            </span>
          </div>
        </div>
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[var(--color-guff-text-muted)] text-sm">No posts yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={session?.user?.id}
              onDelete={() => setPosts(prev => prev.filter(p => p.id !== post.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
