"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { PostCard } from '../../../../components/PostCard';
import { Loader2, Link as LinkIcon, Calendar, Settings, Edit, X, Save, MessageSquare, ShieldCheck, Heart } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [activeTab, setActiveTab] = useState<'posts' | 'media' | 'saved'>('posts');

  // Slide-over settings state
  const [showSettings, setShowSettings] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      await loadProfileData();
    };
    init();
  }, [profileId]);

  const loadProfileData = async () => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();
      
      if (profileData) {
        setProfile(profileData);
        setEditDisplayName(profileData.display_name || '');
        setEditBio(profileData.bio || '');
        setEditWebsite(profileData.website || '');
      }

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
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession && currentSession.user.id !== profileId) {
        const { data: followData } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', currentSession.user.id)
          .eq('following_id', profileId)
          .maybeSingle();
        setIsFollowing(!!followData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = async () => {
    if (!session) return;
    if (isFollowing) {
      setIsFollowing(false);
      setFollowersCount(c => Math.max(0, c - 1));
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

  const saveProfileSettings = async () => {
    if (!session || !profile) return;
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: editDisplayName.trim(),
          bio: editBio.trim(),
          website: editWebsite.trim(),
        })
        .eq('id', session.user.id);

      if (error) throw error;

      // Update local state
      setProfile((prev: any) => ({
        ...prev,
        display_name: editDisplayName.trim(),
        bio: editBio.trim(),
        website: editWebsite.trim(),
      }));

      setShowSettings(false);
    } catch (err) {
      console.error(err);
      alert('Failed to update profile');
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-guff-primary)]" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20 select-none">
        <h2 className="text-xl font-bold text-[var(--color-guff-text)]">User not found</h2>
      </div>
    );
  }

  const isOwnProfile = session?.user?.id === profileId;

  return (
    <div className="max-w-[1000px] mx-auto py-6 px-4 md:py-8 select-none relative">
      {/* Profile Header Card */}
      <section className="card-ember rounded-2xl overflow-hidden relative mb-6">
        {/* Cover Photo */}
        <div className="h-[200px] w-full bg-gradient-to-r from-[var(--color-guff-primary)] to-[var(--color-guff-tertiary)] relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
          {profile.cover_url && (
            <img src={profile.cover_url} alt="" className="w-full h-full object-cover" />
          )}
        </div>

        {/* Profile Info Overlay */}
        <div className="px-6 pb-6">
          <div className="relative flex flex-col sm:flex-row sm:items-end -mt-14 sm:gap-6 mb-4">
            {/* Avatar */}
            <div className="relative inline-block self-start sm:self-auto">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-[#1C1816] bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-3xl font-bold overflow-hidden shadow-md ember-glow">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  profile.username?.[0]?.toUpperCase() || '?'
                )}
              </div>
              <span className="absolute bottom-1 right-1 w-5 h-5 bg-spark border-2 border-[#1C1816] rounded-full"></span>
            </div>

            {/* Profile actions */}
            <div className="mt-4 sm:mt-0 flex-grow flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--color-guff-text)]">
                    {profile.display_name || profile.username}
                  </h1>
                  <ShieldCheck className="w-5 h-5 text-[var(--color-guff-primary)]" />
                </div>
                <p className="text-xs text-[var(--color-guff-text-muted)] mt-0.5">@{profile.username}</p>
              </div>

              <div className="flex gap-2">
                {!isOwnProfile && session ? (
                  <>
                    <button
                      onClick={handleMessage}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold border border-[#4A3D33] bg-[#262220] text-content-secondary hover:bg-[#2e2a27] active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-4 h-4" /> Message
                    </button>
                    <button
                      onClick={toggleFollow}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold active:scale-95 transition-all cursor-pointer ${
                        isFollowing
                          ? 'bg-[#262220] text-content border border-[#4A3D33] hover:bg-blaze/10 hover:text-blaze hover:border-blaze/30'
                          : 'bg-brand text-white hover:bg-brand-hover ember-glow-sm'
                      }`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  </>
                ) : isOwnProfile ? (
                  <button
                    onClick={() => setShowSettings(true)}
                    className="p-2.5 bg-[#262220] border border-[#4A3D33] rounded-xl hover:bg-[#2e2a27] text-content-secondary active:scale-95 transition-all cursor-pointer"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {profile.bio && (
            <p className="text-sm text-[var(--color-guff-text-secondary)] mt-4 leading-relaxed max-w-xl">{profile.bio}</p>
          )}

          {/* Links and Metadata */}
          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-[var(--color-guff-text-muted)]">
            {profile.website && (
              <span className="flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5" />
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-[var(--color-guff-primary)] hover:underline font-semibold">
                  {profile.website.replace(/^https?:\/\//, '')}
                </a>
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Joined {profile.created_at ? format(new Date(profile.created_at), 'MMMM yyyy') : ''}</span>
            </span>
          </div>

          {/* Stats count */}
          <div className="flex gap-8 mt-5 pt-5 border-t border-[var(--color-guff-border)]/40">
            <div className="text-center sm:text-left">
              <span className="block text-lg font-bold text-[var(--color-guff-text)] leading-none">{posts.length}</span>
              <span className="text-[9px] font-extrabold text-[var(--color-guff-text-muted)] uppercase tracking-wider mt-1 block">Posts</span>
            </div>
            <div className="text-center sm:text-left">
              <span className="block text-lg font-bold text-[var(--color-guff-text)] leading-none">{followersCount}</span>
              <span className="text-[9px] font-extrabold text-[var(--color-guff-text-muted)] uppercase tracking-wider mt-1 block">Followers</span>
            </div>
            <div className="text-center sm:text-left">
              <span className="block text-lg font-bold text-[var(--color-guff-text)] leading-none">{followingCount}</span>
              <span className="text-[9px] font-extrabold text-[var(--color-guff-text-muted)] uppercase tracking-wider mt-1 block">Following</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs Menu */}
      <div className="sticky top-0 z-20 bg-[var(--color-guff-surface-bright)]/90 backdrop-blur-md border-b border-[var(--color-guff-outline-variant)]/30 flex gap-6 mb-6">
        <button
          onClick={() => setActiveTab('posts')}
          className={`py-3.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'posts'
              ? 'border-[var(--color-guff-primary)] text-[var(--color-guff-primary)] font-bold'
              : 'border-transparent text-[var(--color-guff-text-secondary)] hover:text-[var(--color-guff-text)]'
          }`}
        >
          Posts
        </button>
        <button
          onClick={() => setActiveTab('media')}
          className={`py-3.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'media'
              ? 'border-[var(--color-guff-primary)] text-[var(--color-guff-primary)] font-bold'
              : 'border-transparent text-[var(--color-guff-text-secondary)] hover:text-[var(--color-guff-text)]'
          }`}
        >
          Media
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`py-3.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'saved'
              ? 'border-[var(--color-guff-primary)] text-[var(--color-guff-primary)] font-bold'
              : 'border-transparent text-[var(--color-guff-text-secondary)] hover:text-[var(--color-guff-text)]'
          }`}
        >
          Saved
        </button>
      </div>

      {/* Grid Content */}
      <div className="space-y-6">
        {activeTab === 'posts' && (
          posts.length === 0 ? (
            <div className="text-center py-16 card-ember rounded-xl">
              <p className="text-[var(--color-guff-text-muted)] text-sm font-semibold">No posts yet</p>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={session?.user?.id}
                  onDelete={() => setPosts(prev => prev.filter(p => p.id !== post.id))}
                />
              ))}
            </div>
          )
        )}

        {activeTab === 'media' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {posts.filter(p => p.media_urls && p.media_urls.length > 0).map(post => (
              <div 
                key={post.id} 
                className="aspect-square relative rounded-xl overflow-hidden cursor-pointer group bg-[#171311] border border-[#4A3D33] shadow-sm"
              >
                <img src={post.media_urls[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-[var(--color-guff-primary)]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white text-xs font-bold">
                  <div className="flex items-center gap-1"><Heart className="w-4 h-4 fill-current" /> {post.likes_count || 0}</div>
                  <div className="flex items-center gap-1"><MessageSquare className="w-4 h-4 fill-current" /> {post.comments_count || 0}</div>
                </div>
              </div>
            ))}
            {posts.filter(p => p.media_urls && p.media_urls.length > 0).length === 0 && (
              <div className="col-span-full text-center py-16 card-ember rounded-xl">
                <p className="text-[var(--color-guff-text-muted)] text-sm font-semibold">No media posts found</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="text-center py-16 card-ember rounded-xl">
            <p className="text-[var(--color-guff-text-muted)] text-sm font-semibold">No saved posts yet</p>
          </div>
        )}
      </div>

      {/* SLIDE-OVER SETTINGS PANEL */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/60 cursor-pointer"
            />
            
            {/* Panel Content */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="absolute right-0 top-0 h-full w-full max-w-sm bg-[#1C1816] shadow-2xl p-6 flex flex-col justify-between border-l border-[#4A3D33]"
            >
              <div>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-lg font-bold text-[var(--color-guff-text)]">Profile Settings</h2>
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="p-1.5 hover:bg-[#262220] rounded-full transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5 text-[var(--color-guff-text-secondary)]" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Display Name */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold text-[var(--color-guff-text-muted)] uppercase tracking-wider">Display Name</label>
                    <input 
                      type="text" 
                      value={editDisplayName}
                      onChange={e => setEditDisplayName(e.target.value)}
                      className="input-field py-2.5 text-xs"
                      placeholder="Your Name"
                    />
                  </div>

                  {/* Bio */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold text-[var(--color-guff-text-muted)] uppercase tracking-wider">Bio</label>
                    <textarea 
                      value={editBio}
                      onChange={e => setEditBio(e.target.value)}
                      rows={3}
                      className="input-field py-2.5 text-xs resize-none"
                      placeholder="Tell others about yourself..."
                      maxLength={160}
                    />
                    <span className="block text-right text-[10px] text-[var(--color-guff-text-muted)]">{editBio.length}/160</span>
                  </div>

                  {/* Website */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold text-[var(--color-guff-text-muted)] uppercase tracking-wider">Website</label>
                    <input 
                      type="text" 
                      value={editWebsite}
                      onChange={e => setEditWebsite(e.target.value)}
                      className="input-field py-2.5 text-xs bg-slate-50 border-none focus:bg-white text-[var(--color-guff-text)]"
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Save changes footer */}
              <button 
                onClick={saveProfileSettings}
                disabled={savingSettings}
                className="w-full py-3.5 bg-[var(--color-guff-primary)] hover:bg-[var(--color-guff-primary-hover)] text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingSettings ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
