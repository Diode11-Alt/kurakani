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
    <div className="max-w-[935px] mx-auto sm:py-6 sm:px-4 select-none relative pb-10">
      {/* Profile Header (Insta-style) */}
      <div className="px-4 pt-4 pb-6 border-b border-[#4A3D33]/40">
        
        {/* Top Info Row: Avatar + Stats */}
        <div className="flex items-center justify-between mb-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 sm:w-[150px] sm:h-[150px] rounded-full p-[3px] bg-gradient-to-tr from-yellow-400 via-brand to-red-600">
              <div className="w-full h-full rounded-full border-[3px] border-[#171311] overflow-hidden bg-[#262220] flex items-center justify-center">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl sm:text-5xl font-bold text-white">{profile.username?.[0]?.toUpperCase() || '?'}</span>
                )}
              </div>
            </div>
            {/* Active Status */}
            <span className="absolute bottom-1 right-1 sm:bottom-4 sm:right-4 w-4 h-4 sm:w-6 sm:h-6 bg-spark border-2 sm:border-4 border-[#171311] rounded-full"></span>
          </div>

          {/* Stats */}
          <div className="flex flex-1 justify-center gap-6 sm:gap-12 px-4 sm:ml-10">
            <div className="flex flex-col items-center justify-center cursor-pointer">
              <span className="text-lg sm:text-xl font-bold text-content">{posts.length}</span>
              <span className="text-[13px] sm:text-sm text-content-muted">posts</span>
            </div>
            <div className="flex flex-col items-center justify-center cursor-pointer">
              <span className="text-lg sm:text-xl font-bold text-content">{followersCount}</span>
              <span className="text-[13px] sm:text-sm text-content-muted">followers</span>
            </div>
            <div className="flex flex-col items-center justify-center cursor-pointer">
              <span className="text-lg sm:text-xl font-bold text-content">{followingCount}</span>
              <span className="text-[13px] sm:text-sm text-content-muted">following</span>
            </div>
          </div>
        </div>

        {/* Bio Section */}
        <div className="mb-4 sm:px-2">
          <div className="flex items-center gap-1.5 mb-1">
            <h1 className="text-sm sm:text-base font-bold text-content leading-tight">
              {profile.display_name || profile.username}
            </h1>
            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-brand" />
          </div>
          
          <div className="text-[13px] sm:text-sm text-content-muted mb-1">
            <span className="text-[#A3A3A3]">@{profile.username}</span> • <span className="text-[#A3A3A3]">Digital Creator</span>
          </div>
          
          {profile.bio && (
            <p className="text-[13px] sm:text-sm text-content whitespace-pre-wrap leading-snug mb-1">{profile.bio}</p>
          )}

          {profile.website && (
            <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[13px] sm:text-sm font-semibold text-[#E0F2FE] hover:underline mt-1">
              <LinkIcon className="w-3 h-3" />
              {profile.website.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 w-full sm:px-2">
          {!isOwnProfile && session ? (
            <>
              <button
                onClick={toggleFollow}
                className={`flex-1 py-1.5 sm:py-2 rounded-lg text-sm font-bold active:scale-95 transition-all ${
                  isFollowing
                    ? 'bg-[#262220] text-content hover:bg-[#2e2a27]'
                    : 'bg-brand text-white hover:bg-brand-hover'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
              <button
                onClick={handleMessage}
                className="flex-1 py-1.5 sm:py-2 rounded-lg text-sm font-bold bg-[#262220] text-content hover:bg-[#2e2a27] active:scale-95 transition-all"
              >
                Message
              </button>
            </>
          ) : isOwnProfile ? (
            <>
              <button
                onClick={() => setShowSettings(true)}
                className="flex-1 py-1.5 sm:py-2 rounded-lg text-sm font-bold bg-[#262220] text-content hover:bg-[#2e2a27] active:scale-95 transition-all"
              >
                Edit profile
              </button>
              <button
                className="flex-1 py-1.5 sm:py-2 rounded-lg text-sm font-bold bg-[#262220] text-content hover:bg-[#2e2a27] active:scale-95 transition-all"
              >
                Share profile
              </button>
            </>
          ) : null}
        </div>

        {/* Story Highlights Mockup */}
        <div className="flex gap-4 mt-6 overflow-x-auto no-scrollbar pb-2 sm:px-2">
          {['Security', 'Travel', 'Work', 'Life'].map((highlight, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1 cursor-pointer min-w-max group">
              <div className="w-16 h-16 rounded-full border border-[#4A3D33] p-[2px] group-hover:border-content-muted transition-colors">
                <div className="w-full h-full rounded-full bg-[#262220] flex items-center justify-center overflow-hidden">
                  <span className="material-symbols-outlined text-content-muted">add</span>
                </div>
              </div>
              <span className="text-[11px] text-content">{highlight}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex items-center justify-around border-b border-[#4A3D33]/40 mt-1 mb-1">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex-1 flex items-center justify-center py-3 border-t-2 -mt-[2px] transition-all ${
            activeTab === 'posts' ? 'border-content text-content' : 'border-transparent text-content-muted'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: activeTab === 'posts' ? "'FILL' 1" : "'FILL' 0" }}>
            grid_on
          </span>
        </button>
        <button
          onClick={() => setActiveTab('media')}
          className={`flex-1 flex items-center justify-center py-3 border-t-2 -mt-[2px] transition-all ${
            activeTab === 'media' ? 'border-content text-content' : 'border-transparent text-content-muted'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: activeTab === 'media' ? "'FILL' 1" : "'FILL' 0" }}>
            movie
          </span>
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`flex-1 flex items-center justify-center py-3 border-t-2 -mt-[2px] transition-all ${
            activeTab === 'saved' ? 'border-content text-content' : 'border-transparent text-content-muted'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: activeTab === 'saved' ? "'FILL' 1" : "'FILL' 0" }}>
            bookmark_border
          </span>
        </button>
      </div>

      {/* Grid Content */}
      <div className="pb-10 w-full max-w-full">
        {activeTab === 'posts' && (
          posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-content-muted">
              <div className="w-20 h-20 rounded-full border-2 border-content-muted flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-4xl">photo_camera</span>
              </div>
              <h3 className="text-xl font-bold text-content mb-2">No Posts Yet</h3>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
              {posts.map(post => (
                <div 
                  key={post.id} 
                  className="aspect-square relative group bg-[#1C1816] overflow-hidden"
                >
                  {post.media_urls?.[0] ? (
                    <img src={post.media_urls[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col p-2 text-[8px] sm:text-xs text-content break-words overflow-hidden bg-gradient-to-br from-[#262220] to-[#1C1816]">
                      {post.content}
                    </div>
                  )}
                  {/* Hover overlay stats */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-white text-xs sm:text-sm font-bold cursor-pointer">
                    <div className="flex items-center gap-1.5"><Heart className="w-4 h-4 fill-white" /> {post.likes_count || 0}</div>
                    <div className="flex items-center gap-1.5"><MessageSquare className="w-4 h-4 fill-white" /> {post.comments_count || 0}</div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'media' && (
          <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
            {posts.filter(p => p.media_urls && p.media_urls.length > 0).map(post => (
              <div 
                key={post.id} 
                className="aspect-square relative overflow-hidden cursor-pointer group bg-[#171311]"
              >
                <img src={post.media_urls[0]} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white text-xs sm:text-sm font-bold">
                  <div className="flex items-center gap-1"><Heart className="w-4 h-4 fill-white" /> {post.likes_count || 0}</div>
                  <div className="flex items-center gap-1"><MessageSquare className="w-4 h-4 fill-white" /> {post.comments_count || 0}</div>
                </div>
              </div>
            ))}
            {posts.filter(p => p.media_urls && p.media_urls.length > 0).length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-content-muted">
                <div className="w-20 h-20 rounded-full border-2 border-content-muted flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-4xl">movie</span>
                </div>
                <h3 className="text-xl font-bold text-content mb-2">No Media Yet</h3>
              </div>
            )}
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="flex flex-col items-center justify-center py-20 text-content-muted">
            <div className="w-20 h-20 rounded-full border-2 border-content-muted flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-4xl">bookmark_border</span>
            </div>
            <h3 className="text-xl font-bold text-content mb-2">Only you can see what you've saved</h3>
            <p className="text-sm">Save photos and videos that you want to see again.</p>
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
