"use client";

import { useState, useEffect } from 'react';
import { sanitizeHtml } from '../lib/sanitize';
import { supabase } from '../lib/supabase';
import { Heart, MessageSquare, Share2, Bookmark, MoreHorizontal, Trash2, ShieldCheck, Check, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

interface PostCardProps {
  post: Record<string, unknown>;
  currentUserId: string;
  isLiked?: boolean;
  isSaved?: boolean;
  onDelete?: () => void;
  onComment?: () => void;
}

export function PostCard({ post, currentUserId, isLiked: isLikedProp, isSaved: isSavedProp, onDelete }: PostCardProps) {
  const [liked, setLiked] = useState(isLikedProp ?? false);
  const [likesCount, setLikesCount] = useState(() => post.likes ? post.likes[0]?.count || 0 : 0);
  const [showMenu, setShowMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Record<string, unknown>[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentsCount, setCommentsCount] = useState(() => post.comments ? post.comments[0]?.count || 0 : 0);
  const [isLiking, setIsLiking] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);
  const [saved, setSaved] = useState(isSavedProp ?? false);
  const [sharesCount, setSharesCount] = useState(() => post.post_shares ? post.post_shares[0]?.count || 0 : 0);

  const author = post.users || post.author;

  useEffect(() => {
    // Skip fetch if parent already provided status (batch-optimized)
    if (isLikedProp !== undefined && isSavedProp !== undefined) return;

    const fetchUserStatus = async () => {
      if (isLikedProp === undefined) {
        const { data: likeData } = await supabase
          .from('likes')
          .select('user_id')
          .eq('user_id', currentUserId)
          .eq('post_id', post.id)
          .maybeSingle();
        if (likeData) setLiked(true);
      }

      if (isSavedProp === undefined) {
        const { data: savedData } = await supabase
          .from('saved_posts')
          .select('id')
          .eq('user_id', currentUserId)
          .eq('post_id', post.id)
          .maybeSingle();
        if (savedData) setSaved(true);
      }
    };
    fetchUserStatus();
  }, [post.id, currentUserId, isLikedProp, isSavedProp]);

  const toggleLike = async () => {
    setIsLiking(true);
    setTimeout(() => setIsLiking(false), 600);

    if (liked) {
      setLiked(false);
      setLikesCount((c: number) => Math.max(0, c - 1));
      const { error } = await supabase.from('likes').delete().eq('user_id', currentUserId).eq('post_id', post.id);
      if (error) {
        setLiked(true);
        setLikesCount((c: number) => c + 1);
        toast.error('Failed to unlike post');
      }
    } else {
      setLiked(true);
      setLikesCount((c: number) => c + 1);
      const { error } = await supabase.from('likes').insert({ user_id: currentUserId, post_id: post.id });
      if (error) {
        setLiked(false);
        setLikesCount((c: number) => Math.max(0, c - 1));
        console.error('Like error:', error.message || error); 
        toast.error(`Failed to like post: ${error.message || 'Unknown error'}`);
      }
    }
  };

  const loadComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, users:author_id(username, avatar_url)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });
    setComments(data || []);
  };

  const handleToggleComments = () => {
    if (!showComments) loadComments();
    setShowComments(!showComments);
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsCommenting(true);
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: post.id, author_id: currentUserId, content: commentText.trim() })
      .select('*, users:author_id(username, avatar_url)')
      .single();

    setIsCommenting(false);

    if (!error && data) {
      setComments(prev => [...prev, data]);
      setCommentsCount((c: number) => c + 1);
      setCommentText('');
    } else {
      console.error('Comment error:', error?.message || error); 
      toast.error(`Failed to post comment: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleDelete = async () => {
    setShowMenu(false);
    toast((t) => (
      <div className="flex flex-col gap-3">
        <span className="font-semibold text-sm">Delete this post?</span>
        <div className="flex gap-2 justify-end">
          <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 text-xs rounded-lg hover:bg-[var(--color-surface-container)] font-medium text-[var(--color-on-surface-variant)]">Cancel</button>
          <button onClick={async () => {
            toast.dismiss(t.id);
            const { error } = await supabase.from('posts').delete().eq('id', post.id);
            if (error) {
              toast.error('Failed to delete post');
            } else {
              onDelete?.();
              toast.success('Post deleted');
            }
          }} className="px-3 py-1.5 text-xs bg-[var(--color-error)] text-white rounded-lg hover:opacity-90 font-medium">Delete</button>
        </div>
      </div>
    ), { duration: 5000 });
  };

  const handleShare = async () => {
    // Copy post link to clipboard
    const postUrl = `${window.location.origin}/feed?post=${post.id}`;
    try {
      await navigator.clipboard.writeText(postUrl);
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Failed to copy link');
    }
    // Track the share
    await supabase.from('post_shares').insert({ user_id: currentUserId, post_id: post.id });
    setSharesCount((c: number) => c + 1);
  };

  const toggleSave = async () => {
    if (saved) {
      setSaved(false);
      const { error } = await supabase.from('saved_posts').delete().eq('user_id', currentUserId).eq('post_id', post.id);
      if (error) {
        setSaved(true);
        toast.error('Failed to unsave');
      } else {
        toast.success('Removed from saved');
      }
    } else {
      setSaved(true);
      const { error } = await supabase.from('saved_posts').insert({ user_id: currentUserId, post_id: post.id });
      if (error) {
        setSaved(false);
        toast.error('Failed to save');
      } else {
        toast.success('Saved!');
      }
    }
  };

  const timeAgo = post.created_at
    ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true })
    : '';

  return (
    <article className="glass-card overflow-hidden rounded-3xl shadow-sm transition-all duration-300 hover:shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)] flex items-center justify-center text-white text-sm font-bold overflow-hidden flex-shrink-0">
            {author?.avatar_url ? (
              <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              author?.username?.[0]?.toUpperCase() || '?'
            )}
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-sm text-[var(--color-on-surface)]">
                {author?.display_name || author?.username || 'User'}
              </span>
              <ShieldCheck className="w-4 h-4 text-[var(--color-primary)]" />
            </div>
            <div className="text-[10px] text-[var(--color-on-surface-variant)] flex items-center gap-1.5">
              <span>@{author?.username}</span>
              <span>•</span>
              <span>{timeAgo}</span>
              <span>•</span>
              <span className="flex items-center gap-0.5 text-[var(--color-primary)]">
                <Check className="w-3 h-3 stroke-[3]" /> Verified
              </span>
            </div>
          </div>
        </div>

        {post.author_id === currentUserId && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-xl text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)] transition-colors cursor-pointer"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border border-[var(--color-outline-variant)] py-1 z-20 overflow-hidden">
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--color-error)] hover:bg-[var(--color-error-container)] transition-colors cursor-pointer text-left font-medium"
                >
                  <Trash2 className="w-4 h-4" /> Delete Post
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {post.content && (
        <div 
          className="px-4 py-2 text-sm text-[var(--color-on-surface)] leading-relaxed whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'], ALLOWED_ATTRS: { 'a': ['href', 'target', 'rel'] } }) }}
        />
      )}

      {/* Media Content */}
      {post.media_urls && post.media_urls.length > 0 && (
        <div className="mt-2 px-4">
          <div className="rounded-xl overflow-hidden bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)]/50">
            {post.media_urls.length === 1 ? (
              post.post_type === 'video' ? (
                <video src={post.media_urls[0]} controls className="w-full max-h-[460px] object-cover" />
              ) : (
                <img src={post.media_urls[0]} alt="" className="w-full max-h-[460px] object-cover" />
              )
            ) : (
              <div className="grid grid-cols-2 gap-0.5">
                {post.media_urls.map((url: string, i: number) => (
                  <img key={i} src={url} alt="" className="w-full h-48 object-cover" />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action toolbar */}
      <div className="flex items-center justify-around px-2 py-2 mt-2 border-t border-[var(--color-outline-variant)]/30 mx-4 select-none">
        <button
          onClick={toggleLike}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            liked
              ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10'
              : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10'
          } ${isLiking ? 'scale-110 duration-200' : ''}`}
        >
          <Heart className={`w-4.5 h-4.5 ${liked ? 'fill-current' : ''}`} />
          <span>{likesCount > 0 ? likesCount : 'Like'}</span>
        </button>

        <button
          onClick={handleToggleComments}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all cursor-pointer ${
            showComments ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10' : ''
          }`}
        >
          <MessageSquare className="w-4.5 h-4.5" />
          <span>{commentsCount > 0 ? commentsCount : 'Comment'}</span>
        </button>

        <button 
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all cursor-pointer"
        >
          <Share2 className="w-4.5 h-4.5" />
          <span>{sharesCount > 0 ? `${sharesCount}` : 'Share'}</span>
        </button>

        <button 
          onClick={toggleSave}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            saved
              ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10'
              : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10'
          }`}
        >
          <Bookmark className={`w-4.5 h-4.5 ${saved ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Comments Drawer */}
      {showComments && (
        <div className="px-4 pb-4 border-t border-[var(--color-outline-variant)]/30 bg-[var(--color-surface-container)] rounded-b-3xl">
          <div className="space-y-3 mt-3 max-h-[250px] overflow-y-auto pr-1">
            {comments.length === 0 ? (
              <p className="text-center py-4 text-xs text-[var(--color-on-surface-variant)]">No comments yet. Be the first to reply!</p>
            ) : (
              comments.map(c => (
                <div key={c.id} className="flex gap-2.5 items-start">
                  <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
                    {c.users?.avatar_url ? (
                      <img src={c.users.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      c.users?.username?.[0]?.toUpperCase() || '?'
                    )}
                  </div>
                  <div className="bg-white rounded-2xl px-3.5 py-2 flex-1 shadow-sm border border-[var(--color-outline-variant)]/50">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-xs text-[var(--color-on-surface)]">
                        @{c.users?.username}
                      </span>
                      {c.author_id === currentUserId && (
                        <button
                          onClick={async () => {
                            const { error } = await supabase.from('comments').delete().eq('id', c.id);
                            if (!error) {
                              setComments(prev => prev.filter(comment => comment.id !== c.id));
                              setCommentsCount((count: number) => Math.max(0, count - 1));
                            } else {
                              toast.error('Failed to delete comment');
                            }
                          }}
                          className="text-[var(--color-error)] hover:bg-[var(--color-error-container)] p-1 rounded-md transition-colors"
                          title="Delete comment"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div 
                      className="text-xs text-[var(--color-on-surface-variant)] mt-1 whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.content, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'], ALLOWED_ATTRS: { 'a': ['href', 'target', 'rel'] } }) }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleComment} className="flex gap-2 mt-3 select-none">
            <input
              type="text"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Write a secure comment..."
              disabled={isCommenting}
              aria-label="Comment text"
              className="input-field text-xs py-2 flex-grow disabled:opacity-50"
            />
            <button type="submit" disabled={!commentText.trim() || isCommenting} className="btn-primary px-4 py-2 text-xs cursor-pointer flex items-center gap-1 disabled:opacity-50">
              {isCommenting && <Loader2 className="w-3 h-3 animate-spin" />}
              Post
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
