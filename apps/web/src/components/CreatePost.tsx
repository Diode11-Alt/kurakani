"use client";

import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Image, Video, Smile, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';
export function CreatePost({ userId, userProfile, onPostCreated }: {
  userId: string;
  userProfile: any;
  onPostCreated: () => void;
}) {
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
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
    if (content.trim().length > 2000) {
      toast.error('Post is too long (max 2000 characters)');
      return;
    }
    setPosting(true);

    try {
      // Upload media files to Supabase Storage
      const mediaUrls: string[] = [];
      for (let file of mediaFiles) {
        if (file.type.startsWith('image/')) {
          try {
            const options = {
              maxSizeMB: 1,
              maxWidthOrHeight: 1920,
              useWebWorker: true
            };
            file = await imageCompression(file, options);
          } catch (error) {
            console.error("Image compression error:", error);
            // Fallback to original file if compression fails
          }
        }
        
        const ext = file.name.split('.').pop() || 'jpg';
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
      setIsFocused(false);
    } catch (err) {
      console.error('Post error:', err);
      toast.error('Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="glass-card p-4 shadow-sm rounded-3xl transition-all duration-300">
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden bg-[var(--color-primary)]">
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
            onFocus={() => setIsFocused(true)}
            placeholder="What's on your mind?"
            aria-label="Post content"
            className={`w-full bg-transparent border-none outline-none focus:ring-0 text-sm leading-relaxed text-[var(--color-guff-text)] placeholder-[var(--color-guff-text-muted)] resize-none pt-2 transition-all duration-300 ${
              isFocused || content ? 'min-h-[80px]' : 'min-h-[48px]'
            }`}
            rows={1}
          />

          {/* Media Previews */}
          {mediaPreviews.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {mediaPreviews.map((url, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden bg-[var(--color-guff-surface-container-low)] border border-[var(--color-guff-border)]/30">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeMedia(i)}
                    className="absolute top-1.5 right-1.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Actions Bar */}
          <div className="mt-3 pt-3 border-t border-[var(--color-guff-border)]/20 flex items-center justify-between">
            <div className="flex items-center gap-1 select-none">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label="Upload Image"
                className="p-2 text-[var(--color-guff-text-secondary)] hover:text-[var(--color-guff-primary)] hover:bg-[var(--color-guff-primary-light)] rounded-xl transition-all flex items-center gap-1.5 cursor-pointer text-xs font-semibold"
              >
                <Image className="w-4 h-4" />
                <span className="hidden sm:inline">Image</span>
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label="Upload Video"
                className="p-2 text-[var(--color-guff-text-secondary)] hover:text-[var(--color-guff-primary)] hover:bg-[var(--color-guff-primary-light)] rounded-xl transition-all flex items-center gap-1.5 cursor-pointer text-xs font-semibold"
              >
                <Video className="w-4 h-4" />
                <span className="hidden sm:inline">Video</span>
              </button>
              <button
                type="button"
                aria-label="Add Emoji"
                className="p-2 text-[var(--color-guff-text-secondary)] hover:text-[var(--color-guff-primary)] hover:bg-[var(--color-guff-primary-light)] rounded-xl transition-all flex items-center gap-1.5 cursor-pointer text-xs font-semibold"
              >
                <Smile className="w-4 h-4" />
                <span className="hidden sm:inline">Emoji</span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                disabled={posting}
              />
            </div>

            <button
              onClick={handlePost}
              disabled={posting || (!content.trim() && mediaFiles.length === 0)}
              className="px-5 py-2 bg-[var(--color-guff-primary)] text-white rounded-xl text-xs font-bold shadow-md hover:bg-[var(--color-guff-primary-hover)] active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
