import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, ActivityIndicator, Dimensions } from 'react-native';
import { Search, Menu, Settings, ShieldCheck, Link as LinkIcon, Grid, Film, Bookmark, Heart, MessageSquare } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { BottomNavBar } from '../components/BottomNavBar';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { useNavigation, useRoute } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const POST_SIZE = (width - 4) / 3;

export default function ProfileScreen() {
  const { userId: currentUserId } = useAuthStore() as any;
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const profileId = route.params?.userId || currentUserId;

  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'posts' | 'media' | 'saved'>('posts');
  const [connectionStatus, setConnectionStatus] = useState<string>('none');
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);

  const loadProfileData = async () => {
    if (!profileId) return;
    try {
      setLoading(true);
      const { data: userProfile, error: profileErr } = await supabase
        .from('users')
        .select('*')
        .eq('id', profileId)
        .maybeSingle();
      
      if (profileErr) throw profileErr;
      setProfile(userProfile);

      const { data: postsData } = await supabase
        .from('posts')
        .select('*, users:author_id(id, username, display_name, avatar_url)')
        .eq('author_id', profileId)
        .order('created_at', { ascending: false });
      setPosts(postsData || []);

      const { count: fersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profileId);
      setFollowersCount(fersCount || 0);

      const { count: fingCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', profileId);
      setFollowingCount(fingCount || 0);

      if (currentUserId && currentUserId !== profileId) {
        const { data: followData } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', currentUserId)
          .eq('following_id', profileId)
          .maybeSingle();
        setIsFollowing(!!followData);

        const { data: conn } = await supabase
          .from('user_connections')
          .select('status')
          .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${profileId}),and(sender_id.eq.${profileId},receiver_id.eq.${currentUserId})`)
          .maybeSingle();
        setConnectionStatus(conn?.status || 'none');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, [profileId, currentUserId]);

  useEffect(() => {
    if (activeTab === 'saved' && currentUserId === profileId) {
      const fetchSaved = async () => {
        setSavedLoading(true);
        try {
          const { data } = await supabase
            .from('saved_posts')
            .select('post_id, posts!saved_posts_post_id_fkey(*, users:author_id(id, username, display_name, avatar_url))')
            .eq('user_id', currentUserId)
            .order('created_at', { ascending: false });
          setSavedPosts((data || []).map((r: any) => r.posts).filter(Boolean));
        } finally {
          setSavedLoading(false);
        }
      };
      fetchSaved();
    }
  }, [activeTab, currentUserId, profileId]);

  const toggleFollow = async () => {
    if (!currentUserId) return;
    if (isFollowing) {
      setIsFollowing(false);
      setFollowersCount(Math.max(0, followersCount - 1));
      await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', profileId);
    } else {
      setIsFollowing(true);
      setFollowersCount(followersCount + 1);
      await supabase.from('follows').insert({ follower_id: currentUserId, following_id: profileId });
    }
  };

  const handleConnect = async () => {
    if (!currentUserId) return;
    if (connectionStatus === 'none') {
      setConnectionStatus('pending');
      await supabase.from('user_connections').insert({ sender_id: currentUserId, receiver_id: profileId, status: 'pending' });
    } else if (connectionStatus === 'pending' || connectionStatus === 'accepted') {
      setConnectionStatus('none');
      await supabase.from('user_connections').delete().or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${profileId}),and(sender_id.eq.${profileId},receiver_id.eq.${currentUserId})`);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.notFoundText}>User not found</Text>
      </SafeAreaView>
    );
  }

  const isOwnProfile = currentUserId === profileId;
  const isPrivateAndUnconnected = !isOwnProfile && profile.requireConnectionRequests && connectionStatus !== 'accepted';

  const renderPostGrid = (items: any[]) => {
    return (
      <View style={styles.gridContainer}>
        {items.map((post, idx) => (
          <TouchableOpacity key={post.id || idx} style={styles.gridItem}>
            {post.media_urls?.[0] ? (
              <Image source={{ uri: post.media_urls[0] }} style={styles.gridImage} />
            ) : (
              <View style={styles.gridTextContainer}>
                <Text style={styles.gridText} numberOfLines={4}>{post.content}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.canGoBack() && navigation.goBack()}>
          <Menu color={colors.onSurfaceVariant} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{profile.username || 'Profile'}</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => isOwnProfile && navigation.navigate('ProfileSettings')}>
          {isOwnProfile ? <Settings color={colors.onSurfaceVariant} size={24} /> : <Search color={colors.onSurfaceVariant} size={24} />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Info Row */}
        <View style={styles.topInfoRow}>
          <View style={styles.avatarWrapper}>
            {profile.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>{profile.username?.[0]?.toUpperCase() || '?'}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{posts.length}</Text>
              <Text style={styles.statLabel}>posts</Text>
            </View>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statValue}>{followersCount}</Text>
              <Text style={styles.statLabel}>followers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statValue}>{followingCount}</Text>
              <Text style={styles.statLabel}>following</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bio Section */}
        <View style={styles.bioSection}>
          <View style={styles.nameRow}>
            <Text style={styles.displayName}>{profile.displayName || profile.username}</Text>
            {profile.isPublic === false && <ShieldCheck size={16} color={colors.primary} />}
          </View>
          <Text style={styles.usernameText}>@{profile.username}</Text>
          
          {!isPrivateAndUnconnected && (
            <>
              {!!profile.bio && <Text style={styles.bioText}>{profile.bio}</Text>}
              {!!profile.website && (
                <TouchableOpacity style={styles.websiteRow}>
                  <LinkIcon size={12} color={colors.primary} />
                  <Text style={styles.websiteText}>{profile.website.replace(/^https?:\/\//, '')}</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
          {isOwnProfile ? (
            <>
              <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => navigation.navigate('ProfileSettings')}>
                <Text style={styles.actionBtnTextSecondary}>Edit profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtnSecondary}>
                <Text style={styles.actionBtnTextSecondary}>Share profile</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity 
                style={isFollowing ? styles.actionBtnSecondary : styles.actionBtnPrimary} 
                onPress={toggleFollow}
              >
                <Text style={isFollowing ? styles.actionBtnTextSecondary : styles.actionBtnTextPrimary}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={connectionStatus === 'accepted' ? styles.actionBtnSecondaryActive : styles.actionBtnSecondary} 
                onPress={handleConnect}
              >
                <Text style={connectionStatus === 'accepted' ? styles.actionBtnTextPrimary : styles.actionBtnTextSecondary}>
                  {connectionStatus === 'accepted' ? 'Connected' : connectionStatus === 'pending' ? 'Requested' : 'Connect'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtnSecondary}>
                <Text style={styles.actionBtnTextSecondary}>Message</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'posts' && styles.activeTabBtn]} onPress={() => setActiveTab('posts')}>
            <Grid size={24} color={activeTab === 'posts' ? colors.onSurface : colors.secondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'media' && styles.activeTabBtn]} onPress={() => setActiveTab('media')}>
            <Film size={24} color={activeTab === 'media' ? colors.onSurface : colors.secondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'saved' && styles.activeTabBtn]} onPress={() => setActiveTab('saved')}>
            <Bookmark size={24} color={activeTab === 'saved' ? colors.onSurface : colors.secondary} />
          </TouchableOpacity>
        </View>

        {/* Grid Content */}
        {isPrivateAndUnconnected ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}><ShieldCheck size={32} color={colors.secondary} /></View>
            <Text style={styles.emptyTitle}>This account is private</Text>
            <Text style={styles.emptyDesc}>Follow to see their photos and videos.</Text>
          </View>
        ) : (
          <View style={styles.contentArea}>
            {activeTab === 'posts' && (
              posts.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconWrap}><Grid size={32} color={colors.secondary} /></View>
                  <Text style={styles.emptyTitle}>No Posts Yet</Text>
                </View>
              ) : renderPostGrid(posts)
            )}

            {activeTab === 'media' && (
              posts.filter(p => p.media_urls?.length).length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconWrap}><Film size={32} color={colors.secondary} /></View>
                  <Text style={styles.emptyTitle}>No Media</Text>
                </View>
              ) : renderPostGrid(posts.filter(p => p.media_urls?.length))
            )}

            {activeTab === 'saved' && (
              isOwnProfile ? (
                savedLoading ? <ActivityIndicator style={{marginTop:40}} /> :
                savedPosts.length === 0 ? (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyIconWrap}><Bookmark size={32} color={colors.secondary} /></View>
                    <Text style={styles.emptyTitle}>Nothing saved yet</Text>
                  </View>
                ) : renderPostGrid(savedPosts)
              ) : (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconWrap}><Bookmark size={32} color={colors.secondary} /></View>
                  <Text style={styles.emptyTitle}>Only they can see what they've saved</Text>
                </View>
              )
            )}
          </View>
        )}
      </ScrollView>
      <BottomNavBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  notFoundText: { fontFamily: typography.fonts.headline, fontSize: 18, color: colors.onBackground },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
  headerTitle: { fontFamily: typography.fonts.headline, fontSize: 18, fontWeight: 'bold', color: colors.onBackground },
  iconBtn: { padding: 4 },
  scrollContent: { paddingBottom: 100 },
  topInfoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 16, marginBottom: 12 },
  avatarWrapper: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surfaceContainerHighest, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarFallback: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 32, fontWeight: 'bold', color: colors.onSurface },
  statsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', marginLeft: 16 },
  statItem: { alignItems: 'center' },
  statValue: { fontFamily: typography.fonts.headline, fontSize: 18, fontWeight: 'bold', color: colors.onSurface },
  statLabel: { fontFamily: typography.fonts.label, fontSize: 13, color: colors.onSurfaceVariant },
  bioSection: { paddingHorizontal: 16, marginBottom: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  displayName: { fontFamily: typography.fonts.bodySemiBold, fontSize: 14, color: colors.onSurface },
  usernameText: { fontFamily: typography.fonts.body, fontSize: 13, color: colors.onSurfaceVariant, marginBottom: 4 },
  bioText: { fontFamily: typography.fonts.body, fontSize: 14, color: colors.onSurface, lineHeight: 20 },
  websiteRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  websiteText: { fontFamily: typography.fonts.labelBold, fontSize: 13, color: colors.primary },
  actionRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  actionBtnPrimary: { flex: 1, backgroundColor: colors.primary, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  actionBtnTextPrimary: { fontFamily: typography.fonts.labelBold, fontSize: 14, color: '#FFFFFF', fontWeight: 'bold' },
  actionBtnSecondary: { flex: 1, backgroundColor: colors.surfaceContainerHigh, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  actionBtnSecondaryActive: { flex: 1, backgroundColor: colors.surfaceContainerHigh, borderWidth: 1, borderColor: colors.primary, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  actionBtnTextSecondary: { fontFamily: typography.fonts.labelBold, fontSize: 14, color: colors.onSurface, fontWeight: 'bold' },
  tabsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.outlineVariant },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'transparent' },
  activeTabBtn: { borderBottomColor: colors.onSurface },
  contentArea: { minHeight: 300 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: colors.outlineVariant, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontFamily: typography.fonts.headline, fontSize: 18, color: colors.onSurface, marginBottom: 8, textAlign: 'center' },
  emptyDesc: { fontFamily: typography.fonts.body, fontSize: 14, color: colors.secondary, textAlign: 'center' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  gridItem: { width: POST_SIZE, height: POST_SIZE, backgroundColor: colors.surfaceContainerLow },
  gridImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  gridTextContainer: { flex: 1, padding: 8, justifyContent: 'center', alignItems: 'center' },
  gridText: { fontFamily: typography.fonts.body, fontSize: 10, color: colors.onSurface, textAlign: 'center' },
});
