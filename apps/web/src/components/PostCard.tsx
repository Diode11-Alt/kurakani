"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Heart, MessageCircle, Share2, MoreHorizontal, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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
    if (liked) {
      setLiked(false);
      setLikesCount((c: number) => c - 1);
      await supabase.from('likes').delete().eq('user_id', currentUserId).eq('post_id', post.id);
    } else {
      setLiked(true);
      setLikesCount((c: number) => c + 1);
      await supabase.from('likes').insert({ user_id: currentUserId, post_id: post.id });
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

    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: post.id, author_id: currentUserId, content: commentText.trim() })
      .select('*, profiles:author_id(username, avatar_url)')
      .single();

    if (!error && data) {
      setComments(prev => [...prev, data]);
      setCommentsCount((c: number) => c + 1);
      setCommentText('');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this post?')) return;
    await supabase.from('posts').delete().eq('id', post.id);
    onDelete?.();
    setShowMenu(false);
  };

  const timeAgo = post.created_at
    ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true })
    : '';

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-sm font-bold overflow-hidden flex-shrink-0">
            {author?.avatar_url ? (
              <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              author?.username?.[0]?.toUpperCase() || '?'
            )}
          </div>
          <div>
            <div className="font-semibold text-sm text-[var(--color-guff-text)]">
              {author?.display_name || author?.username || 'User'}
            </div>
            <div className="text-xs text-[var(--color-guff-text-muted)]">
              @{author?.username} · {timeAgo}
            </div>
          </div>
        </div>

        {post.author_id === currentUserId && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg text-[var(--color-guff-text-muted)] hover:bg-slate-100 transition-colors"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border border-[var(--color-guff-border)] py-1 z-20">
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-guff-danger)] hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {post.content && (
        <p className="px-4 pt-3 text-[15px] text-[var(--color-guff-text)] leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>
      )}

      {/* Media */}
      {post.media_urls && post.media_urls.length > 0 && (
        <div className="mt-3">
          {post.media_urls.length === 1 ? (
            post.post_type === 'video' ? (
              <video src={post.media_urls[0]} controls className="w-full max-h-[500px] object-cover" />
            ) : (
              <img src={post.media_urls[0]} alt="" className="w-full max-h-[500px] object-cover" />
            )
          ) : (
            <div className="grid grid-cols-2 gap-0.5">
              {post.media_urls.map((url: string, i: number) => (
                <img key={i} src={url} alt="" className="w-full h-48 object-cover" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 px-2 py-2 mt-1 border-t border-[var(--color-guff-border)] mx-4">
        <button
          onClick={toggleLike}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            liked
              ? 'text-rose-500 bg-rose-50'
              : 'text-[var(--color-guff-text-secondary)] hover:bg-slate-50'
          }`}
        >
          <Heart className={`w-[18px] h-[18px] ${liked ? 'fill-current' : ''}`} />
          <span>{likesCount > 0 ? likesCount : ''}</span>
        </button>

        <button
          onClick={handleToggleComments}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--color-guff-text-secondary)] hover:bg-slate-50 transition-all"
        >
          <MessageCircle className="w-[18px] h-[18px]" />
          <span>{commentsCount > 0 ? commentsCount : ''}</span>
        </button>

        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--color-guff-text-secondary)] hover:bg-slate-50 transition-all">
          <Share2 className="w-[18px] h-[18px]" />
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="px-4 pb-4 border-t border-[var(--color-guff-border)]">
          <div className="space-y-3 mt-3 max-h-[300px] overflow-y-auto">
            {comments.map(c => (
              <div key={c.id} className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                  {c.profiles?.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="bg-slate-50 rounded-xl px-3 py-2 flex-1">
                  <span className="font-semibold text-xs text-[var(--color-guff-text)]">
                    @{c.profiles?.username}
                  </span>
                  <p className="text-sm text-[var(--color-guff-text-secondary)] mt-0.5">{c.content}</p>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleComment} className="flex gap-2 mt-3">
            <input
              type="text"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              className="input-field text-sm py-2"
            />
            <button type="submit" disabled={!commentText.trim()} className="btn-primary px-4 py-2 text-sm">
              Post
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
