"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Heart, MessageSquare, Share2, Bookmark, MoreHorizontal, Trash2, ShieldCheck, Check, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

interface PostCardProps {
  post: any;
  currentUserId: string;
  onDelete?: () => void;
  onComment?: () => void;
}

export function PostCard({ post, currentUserId, onDelete }: PostCardProps) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [showMenu, setShowMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);

  const author = post.profiles || post.author;

  useEffect(() => {
    // Check if current user liked this post
    supabase
      .from('likes')
      .select('user_id')
      .eq('user_id', currentUserId)
      .eq('post_id', post.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setLiked(true);
      });
  }, [post.id, currentUserId]);

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
        toast.error('Failed to like post');
      }
    }
  };

  const loadComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles:author_id(username, avatar_url)')
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
      .select('*, profiles:author_id(username, avatar_url)')
      .single();

    setIsCommenting(false);

    if (!error && data) {
      setComments(prev => [...prev, data]);
      setCommentsCount((c: number) => c + 1);
      setCommentText('');
    } else {
      toast.error('Failed to post comment');
    }
  };

  const handleDelete = async () => {
    setShowMenu(false);
    toast((t) => (
      <div className="flex flex-col gap-3">
        <span className="font-semibold text-sm">Delete this post?</span>
        <div className="flex gap-2 justify-end">
          <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 text-xs rounded-lg hover:bg-slate-100 font-medium">Cancel</button>
          <button onClick={async () => {
            toast.dismiss(t.id);
            const { error } = await supabase.from('posts').delete().eq('id', post.id);
            if (error) {
              toast.error('Failed to delete post');
            } else {
              onDelete?.();
              toast.success('Post deleted');
            }
          }} className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium">Delete</button>
        </div>
      </div>
    ), { duration: 5000 });
  };

  const timeAgo = post.created_at
    ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true })
    : '';

  return (
    <article className="card overflow-hidden bg-[var(--color-guff-surface-container-lowest)] rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition-all duration-300 hover:shadow-md border border-[var(--color-guff-outline-variant)]/30">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-sm font-bold overflow-hidden flex-shrink-0">
            {author?.avatar_url ? (
              <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              author?.username?.[0]?.toUpperCase() || '?'
            )}
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-sm text-[var(--color-guff-text)]">
                {author?.display_name || author?.username || 'User'}
              </span>
              <ShieldCheck className="w-4 h-4 text-[var(--color-guff-primary)]" />
            </div>
            <div className="text-[10px] text-[var(--color-guff-text-muted)] flex items-center gap-1.5">
              <span>@{author?.username}</span>
              <span>•</span>
              <span>{timeAgo}</span>
              <span>•</span>
              <span className="flex items-center gap-0.5 text-[var(--color-guff-success)]">
                <Check className="w-3 h-3 stroke-[3]" /> Encrypted
              </span>
            </div>
          </div>
        </div>

        {post.author_id === currentUserId && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-xl text-[var(--color-guff-text-muted)] hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border border-[var(--color-guff-border)] py-1 z-20 overflow-hidden">
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--color-guff-danger)] hover:bg-red-50 transition-colors cursor-pointer text-left font-medium"
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
        <p className="px-4 py-2 text-sm text-[var(--color-guff-text)] leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>
      )}

      {/* Media Content */}
      {post.media_urls && post.media_urls.length > 0 && (
        <div className="mt-2 px-4">
          <div className="rounded-xl overflow-hidden bg-slate-50 border border-[var(--color-guff-border)]/20">
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
      <div className="flex items-center justify-around px-2 py-2 mt-2 border-t border-[var(--color-guff-border)]/20 mx-4 select-none">
        <button
          onClick={toggleLike}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            liked
              ? 'text-rose-600 bg-rose-50'
              : 'text-[var(--color-guff-text-secondary)] hover:text-rose-600 hover:bg-rose-50/40'
          } ${isLiking ? 'scale-110 duration-200' : ''}`}
        >
          <Heart className={`w-4.5 h-4.5 ${liked ? 'fill-current' : ''}`} />
          <span>{likesCount > 0 ? likesCount : 'Like'}</span>
        </button>

        <button
          onClick={handleToggleComments}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--color-guff-text-secondary)] hover:text-[var(--color-guff-primary)] hover:bg-[var(--color-guff-primary-light)] transition-all cursor-pointer ${
            showComments ? 'text-[var(--color-guff-primary)] bg-[var(--color-guff-primary-light)]' : ''
          }`}
        >
          <MessageSquare className="w-4.5 h-4.5" />
          <span>{commentsCount > 0 ? commentsCount : 'Comment'}</span>
        </button>

        <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--color-guff-text-secondary)] hover:text-[var(--color-guff-primary)] hover:bg-[var(--color-guff-primary-light)] transition-all cursor-pointer">
          <Share2 className="w-4.5 h-4.5" />
          <span>Share</span>
        </button>

        <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--color-guff-text-secondary)] hover:text-[var(--color-guff-primary)] hover:bg-[var(--color-guff-primary-light)] transition-all cursor-pointer">
          <Bookmark className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Comments Drawer */}
      {showComments && (
        <div className="px-4 pb-4 border-t border-[var(--color-guff-border)]/20 bg-slate-50/50">
          <div className="space-y-3 mt-3 max-h-[250px] overflow-y-auto pr-1">
            {comments.length === 0 ? (
              <p className="text-center py-4 text-xs text-[var(--color-guff-text-muted)]">No comments yet. Be the first to reply!</p>
            ) : (
              comments.map(c => (
                <div key={c.id} className="flex gap-2.5 items-start">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
                    {c.profiles?.avatar_url ? (
                      <img src={c.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      c.profiles?.username?.[0]?.toUpperCase() || '?'
                    )}
                  </div>
                  <div className="bg-white rounded-2xl px-3.5 py-2 flex-1 shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-xs text-[var(--color-guff-text)]">
                        @{c.profiles?.username}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-guff-text-secondary)] mt-1">{c.content}</p>
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
              className="input-field text-xs py-2 bg-white flex-grow disabled:opacity-50"
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
