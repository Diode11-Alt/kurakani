"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, X, ChevronLeft, ChevronRight, Loader2, Play } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Story {
  id: string;
  author_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  created_at: string;
  expires_at: string;
}

interface GroupedStory {
  author: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  stories: Story[];
}

export function StoriesTray({ currentUserId, currentProfile }: { currentUserId: string; currentProfile: any }) {
  const [groupedStories, setGroupedStories] = useState<GroupedStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Viewer state
  const [activeUserIndex, setActiveUserIndex] = useState<number | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  
  const fileRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<any>(null);

  useEffect(() => {
    fetchStories();
  }, []);

  // Manage progress bar animation for the story viewer
  useEffect(() => {
    if (activeUserIndex === null) {
      setProgress(0);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      return;
    }

    setProgress(0);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    const activeUser = groupedStories[activeUserIndex];
    const activeStory = activeUser.stories[activeStoryIndex];
    const duration = activeStory.media_type === 'video' ? 8000 : 5000; // 8s for video, 5s for image
    const intervalTime = 50;
    const increment = (intervalTime / duration) * 100;

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressIntervalRef.current);
          handleNextStory();
          return 100;
        }
        return prev + increment;
      });
    }, intervalTime);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [activeUserIndex, activeStoryIndex]);

  const fetchStories = async () => {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('*, profiles:author_id(id, username, display_name, avatar_url)')
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!data) return;

      // Group stories by author
      const groups: { [key: string]: GroupedStory } = {};
      
      data.forEach((story: any) => {
        const authorId = story.author_id;
        if (!groups[authorId]) {
          groups[authorId] = {
            author: story.profiles,
            stories: [],
          };
        }
        groups[authorId].stories.push({
          id: story.id,
          author_id: story.author_id,
          media_url: story.media_url,
          media_type: story.media_type,
          created_at: story.created_at,
          expires_at: story.expires_at,
        });
      });

      setGroupedStories(Object.values(groups));
    } catch (err) {
      console.error('Error fetching stories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStoryClick = () => {
    fileRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${currentUserId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('stories')
        .getPublicUrl(path);

      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';

      const { error: insertError } = await supabase
        .from('stories')
        .insert({
          author_id: currentUserId,
          media_url: publicUrl,
          media_type: mediaType,
        });

      if (insertError) throw insertError;
      
      await fetchStories();
    } catch (err) {
      console.error('Story upload error:', err);
      alert('Failed to post story');
    } finally {
      setUploading(false);
    }
  };

  const handleNextStory = () => {
    if (activeUserIndex === null) return;
    const activeUser = groupedStories[activeUserIndex];

    if (activeStoryIndex < activeUser.stories.length - 1) {
      setActiveStoryIndex(activeStoryIndex + 1);
    } else {
      // Go to next user
      if (activeUserIndex < groupedStories.length - 1) {
        setActiveUserIndex(activeUserIndex + 1);
        setActiveStoryIndex(0);
      } else {
        // End of all stories
        closeViewer();
      }
    }
  };

  const handlePrevStory = () => {
    if (activeUserIndex === null) return;

    if (activeStoryIndex > 0) {
      setActiveStoryIndex(activeStoryIndex - 1);
    } else {
      // Go to previous user
      if (activeUserIndex > 0) {
        const prevUserIndex = activeUserIndex - 1;
        setActiveUserIndex(prevUserIndex);
        setActiveStoryIndex(groupedStories[prevUserIndex].stories.length - 1);
      } else {
        // Beginning of first story
        closeViewer();
      }
    }
  };

  const closeViewer = () => {
    setActiveUserIndex(null);
    setActiveStoryIndex(0);
    setProgress(0);
  };

  return (
    <div className="w-full relative select-none">
      <div className="flex gap-4 items-center overflow-x-auto pb-2 scrollbar-none py-1">
        {/* Create Story card */}
        <div className="flex flex-col items-center flex-shrink-0 cursor-pointer" onClick={handleCreateStoryClick}>
          <div className="relative w-16 h-16 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 transition-colors border-2 border-dashed border-slate-300">
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-[var(--color-guff-primary)]" />
            ) : currentProfile?.avatar_url ? (
              <div className="w-full h-full rounded-full overflow-hidden">
                <img src={currentProfile.avatar_url} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <span className="text-slate-600 font-bold text-sm">
                {currentProfile?.username?.[0]?.toUpperCase() || '+'}
              </span>
            )}
            
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[var(--color-guff-primary)] flex items-center justify-center border-2 border-white text-white">
              <Plus className="w-4 h-4 stroke-[3]" />
            </div>
          </div>
          <span className="text-[11px] font-medium text-[var(--color-guff-text-secondary)] mt-2">Add Story</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
          />
        </div>

        {/* Existing Stories Users */}
        {groupedStories.map((group, userIdx) => (
          <div
            key={group.author.id}
            className="flex flex-col items-center flex-shrink-0 cursor-pointer"
            onClick={() => {
              setActiveUserIndex(userIdx);
              setActiveStoryIndex(0);
            }}
          >
            {/* Story Ring wrapper */}
            <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-500">
              <div className="w-15 h-15 rounded-full border-2 border-white overflow-hidden bg-slate-200">
                {group.author.avatar_url ? (
                  <img src={group.author.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-700 font-bold text-sm">
                    {group.author.username[0].toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <span className="text-[11px] font-medium text-[var(--color-guff-text-secondary)] mt-2 max-w-[70px] truncate">
              {group.author.display_name || group.author.username}
            </span>
          </div>
        ))}
      </div>

      {/* FULLSCREEN STORY VIEWER MODAL */}
      {activeUserIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          {/* Close button */}
          <button
            onClick={closeViewer}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-55 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Left Arrow (Desktop) */}
          <button
            onClick={handlePrevStory}
            className="hidden md:flex absolute left-8 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white z-55 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Story Container (max aspect ratio container) */}
          <div className="relative w-full max-w-[420px] h-full md:h-[90vh] md:rounded-2xl overflow-hidden bg-zinc-950 flex flex-col justify-between shadow-2xl">
            {/* Progress Bars (Top Overlay) */}
            <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/60 to-transparent flex gap-1.5 z-20">
              {groupedStories[activeUserIndex].stories.map((story, idx) => {
                let widthPercent = 0;
                if (idx < activeStoryIndex) widthPercent = 100;
                else if (idx === activeStoryIndex) widthPercent = progress;

                return (
                  <div key={story.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-75"
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Author Profile Information (Top Left Overlay) */}
            <div className="absolute top-5 left-0 right-0 px-4 py-2 flex items-center justify-between z-20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20 bg-slate-300">
                  {groupedStories[activeUserIndex].author.avatar_url ? (
                    <img src={groupedStories[activeUserIndex].author.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-800 font-bold text-xs">
                      {groupedStories[activeUserIndex].author.username[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-white font-semibold text-xs leading-none">
                    {groupedStories[activeUserIndex].author.display_name || groupedStories[activeUserIndex].author.username}
                  </div>
                  <div className="text-white/60 text-[10px] mt-0.5 leading-none">
                    {formatDistanceToNow(new Date(groupedStories[activeUserIndex].stories[activeStoryIndex].created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
            </div>

            {/* Tap areas for navigation (Mobile) */}
            <div className="absolute inset-0 z-10 flex">
              <div className="w-1/3 h-full cursor-west-resize" onClick={handlePrevStory} />
              <div className="w-1/3 h-full" onClick={handleNextStory} />
              <div className="w-1/3 h-full cursor-east-resize" onClick={handleNextStory} />
            </div>

            {/* Story Content (Image / Video) */}
            <div className="flex-1 flex items-center justify-center w-full h-full bg-zinc-950">
              {groupedStories[activeUserIndex].stories[activeStoryIndex].media_type === 'video' ? (
                <video
                  src={groupedStories[activeUserIndex].stories[activeStoryIndex].media_url}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={groupedStories[activeUserIndex].stories[activeStoryIndex].media_url}
                  alt=""
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          </div>

          {/* Right Arrow (Desktop) */}
          <button
            onClick={handleNextStory}
            className="hidden md:flex absolute right-8 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white z-55 transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}
