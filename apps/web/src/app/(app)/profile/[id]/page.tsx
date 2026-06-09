"use client";

import { useState, useEffect, useCallback } from "react";
import { getUserById, updateProfile } from "../../../../lib/api";
import { supabase } from "../../../../lib/supabase";
import { useAuthStore } from "../../../../store/authStore";
import { PostCard } from "../../../../components/PostCard";
import {
  Loader2,
  Link as LinkIcon,
  X,
  Save,
  MessageSquare,
  ShieldCheck,
  Heart,
  ChevronLeft,
  ChevronRight,
  Bookmark,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const profileId = params.id as string;
  const { userId: currentUserId } = useAuthStore();

  const [profile, setProfile] = useState<any | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"posts" | "media" | "saved">(
    "posts",
  );
  const [connectionStatus, setConnectionStatus] = useState<string>("none");

  // Post preview modal
  const [previewPost, setPreviewPost] = useState<any | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);

  // Followers/Following modal
  const [followModal, setFollowModal] = useState<"followers" | "following" | null>(null);
  const [followModalUsers, setFollowModalUsers] = useState<any[]>([]);
  const [followModalLoading, setFollowModalLoading] = useState(false);

  // Saved posts
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);

  // Slide-over settings state
  const [showSettings, setShowSettings] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    loadProfileData();
  }, [profileId]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const userProfile = await getUserById(profileId);

      setProfile(userProfile);
      setEditDisplayName(userProfile.displayName || userProfile.username || "");
      setEditUsername(userProfile.username || "");
      setEditBio(userProfile.bio || "");
      setEditWebsite("");

      // Fetch real posts
      const { data: postsData } = await (
        await import("../../../../lib/supabase")
      ).supabase
        .from("posts")
        .select("*, users:author_id(id, username, display_name, avatar_url)")
        .eq("author_id", profileId)
        .order("created_at", { ascending: false });
      setPosts(postsData || []);

      // Fetch real follower/following counts
      const { count: fersCount } = await (
        await import("../../../../lib/supabase")
      ).supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profileId);
      setFollowersCount(fersCount || 0);

      const { count: fingCount } = await (
        await import("../../../../lib/supabase")
      ).supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profileId);
      setFollowingCount(fingCount || 0);

      // Check if current user follows this profile
      if (currentUserId && currentUserId !== profileId) {
        const { data: followData } = await (
          await import("../../../../lib/supabase")
        ).supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", currentUserId)
          .eq("following_id", profileId)
          .maybeSingle();
        setIsFollowing(!!followData);

        const { data: conn } = await (
          await import("../../../../lib/supabase")
        ).supabase
          .from("user_connections")
          .select("status")
          .or(
            `and(sender_id.eq.${currentUserId},receiver_id.eq.${profileId}),and(sender_id.eq.${profileId},receiver_id.eq.${currentUserId})`,
          )
          .maybeSingle();
        setConnectionStatus(conn?.status || "none");
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = async () => {
    if (!currentUserId) return;
    const { supabase } = await import("../../../../lib/supabase");
    if (isFollowing) {
      setIsFollowing(false);
      setFollowersCount((c) => Math.max(0, c - 1));
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", profileId);
    } else {
      setIsFollowing(true);
      setFollowersCount((c) => c + 1);
      await supabase.from("follows").insert({
        follower_id: currentUserId,
        following_id: profileId,
      });
    }
  };

  const handleConnect = async () => {
    if (!currentUserId) return;
    const { supabase } = await import("../../../../lib/supabase");

    if (connectionStatus === "none") {
      await supabase.from("user_connections").insert({
        sender_id: currentUserId,
        receiver_id: profileId,
        status: "pending",
      });
      setConnectionStatus("pending");
    } else if (connectionStatus === "pending" || connectionStatus === "accepted") {
      // Cancel request or remove connection
      await supabase
        .from("user_connections")
        .delete()
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${profileId}),and(sender_id.eq.${profileId},receiver_id.eq.${currentUserId})`,
        );
      setConnectionStatus("none");
    }
  };

  const handleMessage = async () => {
    if (!currentUserId) return;
    try {
      // Find existing conversation between these two users
      const { data: myMemberships } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", currentUserId);
      const convIds = (myMemberships || []).map((m) => m.conversation_id);
      let conversationId = null;
      if (convIds.length > 0) {
        const { data: commonConv } = await supabase
          .from("conversation_members")
          .select("conversation_id")
          .in("conversation_id", convIds)
          .eq("user_id", profileId)
          .limit(1)
          .maybeSingle();
        conversationId = commonConv?.conversation_id;
      }
      // Create if doesn't exist
      if (!conversationId) {
        const newConvId = crypto.randomUUID();
        await supabase
          .from("conversations")
          .insert({ id: newConvId, type: "direct", created_by: currentUserId });
        conversationId = newConvId;
        const { error: memErr1 } = await supabase.from("conversation_members").insert(
          { conversation_id: conversationId, user_id: currentUserId }
        );
        if (memErr1) throw memErr1;

        const { error: memErr2 } = await supabase.from("conversation_members").insert(
          { conversation_id: conversationId, user_id: profileId }
        );
        if (memErr2) throw memErr2;
      }
      router.push(`/messages/${conversationId}`);
    } catch (err) {
      console.error("Error starting conversation:", err);
      toast.error("Failed to start conversation");
    }
  };

  const saveProfileSettings = async () => {
    if (!profile) return;
    setSavingSettings(true);
    try {
      await updateProfile({
        displayName: editDisplayName.trim(),
        username: editUsername.trim() || undefined,
        bio: editBio.trim(),
      });

      // Update local state
      setProfile((prev: any | null) => (prev ? {
        ...prev,
        displayName: editDisplayName.trim(),
        username: editUsername.trim() || prev.username as string,
        bio: editBio.trim(),
      } : null));

      setShowSettings(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update profile");
    } finally {
      setSavingSettings(false);
    }
  };

  const openFollowModal = async (type: "followers" | "following") => {
    setFollowModal(type);
    setFollowModalLoading(true);
    setFollowModalUsers([]);
    try {
      const { supabase } = await import("../../../../lib/supabase");
      if (type === "followers") {
        // people who follow this profile
        const { data } = await supabase
          .from("follows")
          .select("follower_id, users!follows_follower_id_fkey(id, username, display_name, avatar_url)")
          .eq("following_id", profileId);
        setFollowModalUsers((data || []).map((r: any) => r.users));
      } else {
        // people this profile follows
        const { data } = await supabase
          .from("follows")
          .select("following_id, users!follows_following_id_fkey(id, username, display_name, avatar_url)")
          .eq("follower_id", profileId);
        setFollowModalUsers((data || []).map((r: any) => r.users));
      }
    } finally {
      setFollowModalLoading(false);
    }
  };

  const openPostPreview = (post: any, index: number) => {
    setPreviewPost(post);
    setPreviewIndex(index);
  };

  const loadSavedPosts = useCallback(async () => {
    if (!currentUserId || currentUserId !== profileId) return;
    setSavedLoading(true);
    try {
      const { supabase } = await import("../../../../lib/supabase");
      const { data } = await supabase
        .from("saved_posts")
        .select("post_id, posts!saved_posts_post_id_fkey(*, users:author_id(id, username, display_name, avatar_url))")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false });
      setSavedPosts((data || []).map((r: any) => r.posts).filter(Boolean));
    } finally {
      setSavedLoading(false);
    }
  }, [currentUserId, profileId]);

  useEffect(() => {
    if (activeTab === "saved") loadSavedPosts();
  }, [activeTab, loadSavedPosts]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20 select-none">
        <h2 className="text-xl font-bold text-[var(--color-on-surface)]">
          User not found
        </h2>
      </div>
    );
  }

  const isOwnProfile = currentUserId === profileId;
  const isPrivateAndUnconnected =
    !isOwnProfile &&
    profile.requireConnectionRequests &&
    connectionStatus !== "accepted";

  return (
    <div className="max-w-[935px] mx-auto sm:py-6 sm:px-4 select-none relative pb-10">
      {/* Profile Header (Insta-style) */}
      <div className="px-4 pt-4 pb-6 border-b border-[var(--color-outline-variant)]/40">
        {/* Top Info Row: Avatar + Stats */}
        <div className="flex items-center justify-between mb-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 sm:w-[150px] sm:h-[150px] rounded-full p-[3px] bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-600">
              <div className="w-full h-full rounded-full border-[3px] border-[var(--color-background)] overflow-hidden bg-[var(--color-surface-container)] flex items-center justify-center">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl sm:text-5xl font-bold text-white">
                    {profile.username?.[0]?.toUpperCase() || "?"}
                  </span>
                )}
              </div>
            </div>
            {/* Active Status */}
            <span className="absolute bottom-1 right-1 sm:bottom-4 sm:right-4 w-4 h-4 sm:w-6 sm:h-6 bg-green-500 border-2 sm:border-4 border-[var(--color-background)] rounded-full"></span>
          </div>

          {/* Stats */}
          <div className="flex flex-1 justify-center gap-6 sm:gap-12 px-4 sm:ml-10">
            <div className="flex flex-col items-center justify-center cursor-pointer">
              <span className="text-lg sm:text-xl font-bold text-[var(--color-on-surface)]">
                {posts.length}
              </span>
              <span className="text-[13px] sm:text-sm text-[var(--color-on-surface-variant)]">
                posts
              </span>
            </div>
            <div className="flex flex-col items-center justify-center cursor-pointer" onClick={() => openFollowModal("followers")}>
              <span className="text-lg sm:text-xl font-bold text-[var(--color-on-surface)]">
                {followersCount}
              </span>
              <span className="text-[13px] sm:text-sm text-[var(--color-on-surface-variant)]">
                followers
              </span>
            </div>
            <div className="flex flex-col items-center justify-center cursor-pointer" onClick={() => openFollowModal("following")}>
              <span className="text-lg sm:text-xl font-bold text-[var(--color-on-surface)]">
                {followingCount}
              </span>
              <span className="text-[13px] sm:text-sm text-[var(--color-on-surface-variant)]">
                following
              </span>
            </div>
          </div>
        </div>

        {/* Bio Section */}
        <div className="mb-4 sm:px-2">
          <div className="flex items-center gap-1.5 mb-1">
            <h1 className="text-sm sm:text-base font-bold text-[var(--color-on-surface)] leading-tight">
              {profile.displayName || profile.username}
            </h1>
            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-primary)]" />
          </div>

          <div className="text-[13px] sm:text-sm text-[var(--color-on-surface-variant)] mb-1">
            <span className="text-[var(--color-on-surface-variant)]">
              @{profile.username}
            </span>
            {profile.isPublic === false && (
              <span className="ml-2 text-xs bg-[var(--color-surface-container-highest)] px-2 py-0.5 rounded-full">
                Private Account
              </span>
            )}
          </div>

          {isPrivateAndUnconnected ? (
            <div className="py-4 text-center border border-[var(--color-outline-variant)] rounded-xl bg-[var(--color-surface-container-lowest)] mt-4">
              <ShieldCheck className="w-8 h-8 mx-auto text-[var(--color-on-surface-variant)] mb-2" />
              <p className="text-sm font-bold text-[var(--color-on-surface)]">
                This account is private
              </p>
              <p className="text-xs text-[var(--color-on-surface-variant)] mt-1">
                Connect with them to see their full profile and send messages.
              </p>
            </div>
          ) : (
            <>
              {profile.bio && (
                <p className="text-[13px] sm:text-sm text-[var(--color-on-surface)] whitespace-pre-wrap leading-snug mb-1">
                  {profile.bio}
                </p>
              )}

              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[13px] sm:text-sm font-semibold text-[var(--color-primary)] hover:underline mt-1"
                >
                  <LinkIcon className="w-3 h-3" />
                  {profile.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 w-full sm:px-2">
          {!isOwnProfile ? (
            <>
              <button
                onClick={toggleFollow}
                className={`flex-1 py-1.5 sm:py-2 rounded-lg text-sm font-bold active:scale-95 transition-all ${
                  isFollowing
                    ? "bg-[var(--color-surface-container)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)]"
                    : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-container)]"
                }`}
              >
                {isFollowing ? "Following" : "Follow"}
              </button>

              <button
                onClick={handleConnect}
                className={`flex-1 py-1.5 sm:py-2 rounded-lg text-sm font-bold active:scale-95 transition-all ${
                  connectionStatus === "accepted"
                    ? "bg-[var(--color-surface-container)] text-[var(--color-primary)] border border-[var(--color-primary)]"
                    : connectionStatus === "pending"
                    ? "bg-[var(--color-surface-container)] text-[var(--color-on-surface)]"
                    : "bg-[var(--color-surface-container)] text-[var(--color-on-surface)] border border-[var(--color-outline-variant)]"
                }`}
              >
                {connectionStatus === "accepted" ? "Connected" : connectionStatus === "pending" ? "Requested" : "Connect"}
              </button>

              <button
                onClick={handleMessage}
                className="flex-1 py-1.5 sm:py-2 rounded-lg text-sm font-bold bg-[var(--color-surface-container)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)] active:scale-95 transition-all"
              >
                Message
              </button>
            </>
          ) : isOwnProfile ? (
            <>
              <button
                onClick={() => setShowSettings(true)}
                className="flex-1 py-1.5 sm:py-2 rounded-lg text-sm font-bold bg-[var(--color-surface-container)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)] active:scale-95 transition-all"
              >
                Edit profile
              </button>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Profile link copied!");
                }}
                className="flex-1 py-1.5 sm:py-2 rounded-lg text-sm font-bold bg-[var(--color-surface-container)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)] active:scale-95 transition-all"
              >
                Share profile
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex items-center justify-around border-b border-[var(--color-outline-variant)]/40 mt-1 mb-1">
        <button
          onClick={() => setActiveTab("posts")}
          className={`flex-1 flex items-center justify-center py-3 border-t-2 -mt-[2px] transition-all ${
            activeTab === "posts"
              ? "border-[var(--color-outline-variant)] text-[var(--color-on-surface)]"
              : "border-transparent text-[var(--color-on-surface-variant)]"
          }`}
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={{
              fontVariationSettings:
                activeTab === "posts" ? "'FILL' 1" : "'FILL' 0",
            }}
          >
            grid_on
          </span>
        </button>
        <button
          onClick={() => setActiveTab("media")}
          className={`flex-1 flex items-center justify-center py-3 border-t-2 -mt-[2px] transition-all ${
            activeTab === "media"
              ? "border-[var(--color-outline-variant)] text-[var(--color-on-surface)]"
              : "border-transparent text-[var(--color-on-surface-variant)]"
          }`}
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={{
              fontVariationSettings:
                activeTab === "media" ? "'FILL' 1" : "'FILL' 0",
            }}
          >
            movie
          </span>
        </button>
        <button
          onClick={() => setActiveTab("saved")}
          className={`flex-1 flex items-center justify-center py-3 border-t-2 -mt-[2px] transition-all ${
            activeTab === "saved"
              ? "border-[var(--color-outline-variant)] text-[var(--color-on-surface)]"
              : "border-transparent text-[var(--color-on-surface-variant)]"
          }`}
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={{
              fontVariationSettings:
                activeTab === "saved" ? "'FILL' 1" : "'FILL' 0",
            }}
          >
            bookmark_border
          </span>
        </button>
      </div>

      {/* Grid Content */}
      <div className="pb-10 w-full max-w-full">
        {isPrivateAndUnconnected ? (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--color-on-surface-variant)]">
            <div className="w-20 h-20 rounded-full border-2 border-[var(--color-outline-variant)] flex items-center justify-center mb-4">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[var(--color-on-surface)] mb-2">
              Private Account
            </h3>
          </div>
        ) : (
          <>
            {activeTab === "posts" &&
              (posts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-[var(--color-on-surface-variant)]">
                  <div className="w-20 h-20 rounded-full border-2 border-[var(--color-outline-variant)] flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-4xl">
                      photo_camera
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-[var(--color-on-surface)] mb-2">
                    No Posts Yet
                  </h3>
                </div>
              ) : (
                <div className="flex flex-col gap-4 max-w-xl mx-auto w-full">
                  {posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      currentUserId={currentUserId || ""}
                      onDelete={() => {
                        setPosts((prev) => prev.filter((p) => p.id !== post.id));
                      }}
                    />
                  ))}
                </div>
              ))}

            {activeTab === "media" && (
              <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
                {posts
                  .filter((p) => p.media_urls && p.media_urls.length > 0)
                  .map((post, idx) => (
                    <div
                      key={post.id}
                      onClick={() => openPostPreview(post, idx)}
                      className="aspect-square relative overflow-hidden cursor-pointer group bg-[var(--color-surface-container-lowest)]"
                    >
                      <img
                        src={post.media_urls[0]}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white text-xs sm:text-sm font-bold">
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4 fill-white" />{" "}
                          {post.likes_count || 0}
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4 fill-white" />{" "}
                          {post.comments_count || 0}
                        </div>
                      </div>
                    </div>
                  ))}
                {posts.filter((p) => p.media_urls && p.media_urls.length > 0)
                  .length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 text-[var(--color-on-surface-variant)]">
                    <div className="w-20 h-20 rounded-full border-2 border-[var(--color-outline-variant)] flex items-center justify-center mb-4">
                      <span className="material-symbols-outlined text-4xl">
                        movie
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-[var(--color-on-surface)] mb-2">
                      No Media Yet
                    </h3>
                  </div>
                )}
              </div>
            )}

            {activeTab === "saved" && (
              isOwnProfile ? (
                savedLoading ? (
                  <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" /></div>
                ) : savedPosts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-[var(--color-on-surface-variant)]">
                    <div className="w-20 h-20 rounded-full border-2 border-[var(--color-outline-variant)] flex items-center justify-center mb-4">
                      <Bookmark className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-[var(--color-on-surface)] mb-2">Nothing saved yet</h3>
                    <p className="text-sm">Tap the bookmark icon on any post to save it here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
                    {savedPosts.map((post, idx) => (
                      <div
                        key={post.id}
                        onClick={() => openPostPreview(post, idx)}
                        className="aspect-square relative group bg-[var(--color-surface)] overflow-hidden cursor-pointer"
                      >
                        {post.media_urls?.[0] ? (
                          <img src={post.media_urls[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col p-2 text-[8px] sm:text-xs text-[var(--color-on-surface)] break-words overflow-hidden bg-gradient-to-br from-[var(--color-surface-container)] to-[var(--color-surface)]">
                            {post.content}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-white text-xs sm:text-sm font-bold">
                          <div className="flex items-center gap-1.5"><Heart className="w-4 h-4 fill-white" /> {post.likes_count || 0}</div>
                          <div className="flex items-center gap-1.5"><MessageSquare className="w-4 h-4 fill-white" /> {post.comments_count || 0}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-[var(--color-on-surface-variant)]">
                  <div className="w-20 h-20 rounded-full border-2 border-[var(--color-outline-variant)] flex items-center justify-center mb-4">
                    <Bookmark className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-[var(--color-on-surface)] mb-2">Only you can see what you've saved</h3>
                  <p className="text-sm">Save photos and videos that you want to see again.</p>
                </div>
              )
            )}
          </>
        )}
      </div>

      {/* POST PREVIEW MODAL */}
      <AnimatePresence>
        {previewPost && (
          <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewPost(null)}
              className="absolute inset-0 bg-black/80 cursor-pointer"
            />
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 260 }}
              className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* nav arrows */}
              {posts.length > 1 && (
                <>
                  <button
                    onClick={() => {
                      const prev = (previewIndex - 1 + posts.length) % posts.length;
                      setPreviewPost(posts[prev]);
                      setPreviewIndex(prev);
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      const next = (previewIndex + 1) % posts.length;
                      setPreviewPost(posts[next]);
                      setPreviewIndex(next);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
              <button
                onClick={() => setPreviewPost(null)}
                className="absolute top-3 right-3 z-20 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              <PostCard
                post={previewPost}
                currentUserId={currentUserId || ""}
                onDelete={() => {
                  setPosts((prev) => prev.filter((p) => p.id !== previewPost.id));
                  setPreviewPost(null);
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FOLLOWERS / FOLLOWING MODAL */}
      <AnimatePresence>
        {followModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFollowModal(null)}
              className="absolute inset-0 bg-black/60"
            />
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 260 }}
              className="relative z-10 bg-[var(--color-surface)] rounded-2xl w-full max-w-sm mx-4 max-h-[70vh] flex flex-col overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-outline-variant)]/40">
                <h3 className="text-base font-bold text-[var(--color-on-surface)] capitalize">{followModal}</h3>
                <button onClick={() => setFollowModal(null)} className="p-1.5 rounded-full hover:bg-[var(--color-surface-container)] transition-colors">
                  <X className="w-5 h-5 text-[var(--color-on-surface-variant)]" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1">
                {followModalLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" /></div>
                ) : followModalUsers.length === 0 ? (
                  <div className="py-10 text-center text-sm text-[var(--color-on-surface-variant)]">
                    No {followModal} yet.
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--color-outline-variant)]/30">
                    {followModalUsers.map((u) => u && (
                      <Link
                        key={u.id}
                        href={`/profile/${u.id}`}
                        onClick={() => setFollowModal(null)}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--color-surface-container)] transition-colors"
                      >
                        <div className="w-11 h-11 rounded-full bg-[var(--color-primary-container)] overflow-hidden flex items-center justify-center text-white font-bold flex-shrink-0">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span>{u.username?.[0]?.toUpperCase() || "?"}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-[var(--color-on-surface)] truncate">{u.display_name || u.username}</p>
                          <p className="text-xs text-[var(--color-on-surface-variant)] truncate">@{u.username}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="absolute right-0 top-0 h-full w-full max-w-sm bg-[var(--color-surface)] shadow-2xl p-6 flex flex-col justify-between border-l border-[var(--color-outline-variant)]"
            >
              <div>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-lg font-bold text-[var(--color-on-surface)]">
                    Profile Settings
                  </h2>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-1.5 hover:bg-[var(--color-surface-container)] rounded-full transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5 text-[var(--color-on-surface-variant)]" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Display Name */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold text-[var(--color-on-surface-variant)] uppercase tracking-wider">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      className="input-field py-2.5 text-xs"
                      placeholder="Your Name"
                    />
                  </div>

                  {/* Username */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold text-[var(--color-on-surface-variant)] uppercase tracking-wider">
                      Username
                    </label>
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value.replace(/\s+/g, '').toLowerCase())}
                      className="input-field py-2.5 text-xs"
                      placeholder="username"
                    />
                  </div>

                  {/* Bio */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold text-[var(--color-on-surface-variant)] uppercase tracking-wider">
                      Bio
                    </label>
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      rows={3}
                      className="input-field py-2.5 text-xs resize-none"
                      placeholder="Tell others about yourself..."
                      maxLength={160}
                    />
                    <span className="block text-right text-[10px] text-[var(--color-on-surface-variant)]">
                      {editBio.length}/160
                    </span>
                  </div>

                  {/* Website */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold text-[var(--color-on-surface-variant)] uppercase tracking-wider">
                      Website
                    </label>
                    <input
                      type="text"
                      value={editWebsite}
                      onChange={(e) => setEditWebsite(e.target.value)}
                      className="input-field py-2.5 text-xs bg-slate-50 border-none focus:bg-white text-[var(--color-on-surface)]"
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Save changes footer */}
              <button
                onClick={saveProfileSettings}
                disabled={savingSettings}
                className="w-full py-3.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-container)] text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
