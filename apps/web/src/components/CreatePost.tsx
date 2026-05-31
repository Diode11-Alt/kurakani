"use client";

import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { ImagePlus, Loader2, X } from 'lucide-react';

export function CreatePost({ userId, userProfile, onPostCreated }: {
  userId: string;
  userProfile: any;
  onPostCreated: () => void;
}) {
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setMediaFiles(prev => [...prev, ...files]);
    files.forEach(file => {
      const url = URL.createObjectURL(file);
      setMediaPreviews(prev => [...prev, url]);
    });
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handlePost = async () => {
    if (!content.trim() && mediaFiles.length === 0) return;
    setPosting(true);

    try {
      // Upload media files to Supabase Storage
      const mediaUrls: string[] = [];
      for (const file of mediaFiles) {
        const ext = file.name.split('.').pop();
        const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from('posts').upload(path, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('posts').getPublicUrl(path);
        mediaUrls.push(publicUrl);
      }

      const postType = mediaFiles.length > 0
        ? (mediaFiles[0].type.startsWith('video/') ? 'video' : 'image')
        : 'text';

      const { error } = await supabase.from('posts').insert({
        author_id: userId,
        content: content.trim(),
        media_urls: mediaUrls,
        post_type: postType,
      });

      if (error) throw error;

      setContent('');
      setMediaFiles([]);
      mediaPreviews.forEach(URL.revokeObjectURL);
      setMediaPreviews([]);
      onPostCreated();
    } catch (err) {
      console.error('Post error:', err);
      alert('Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="card p-5">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden">
          {userProfile?.avatar_url ? (
            <img src={userProfile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            userProfile?.username?.[0]?.toUpperCase() || '?'
          )}
        </div>

        {/* Input */}
        <div className="flex-1">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full resize-none outline-none text-[var(--color-guff-text)] placeholder-[var(--color-guff-text-muted)] text-[15px] leading-relaxed bg-transparent min-h-[60px]"
            rows={2}
          />

          {/* Media Previews */}
          {mediaPreviews.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {mediaPreviews.map((url, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden bg-slate-100">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeMedia(i)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--color-guff-border)]">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="p-2 rounded-lg text-[var(--color-guff-text-muted)] hover:bg-[var(--color-guff-primary-light)] hover:text-[var(--color-guff-primary)] transition-colors"
              >
                <ImagePlus className="w-5 h-5" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            <button
              onClick={handlePost}
              disabled={posting || (!content.trim() && mediaFiles.length === 0)}
              className="btn-primary px-5 py-2 text-sm"
            >
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
