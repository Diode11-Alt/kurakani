"use client";

import { useState, useEffect, useRef } from 'react';

import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, Phone, Video, MoreVertical, Send, Paperclip, Mic, Shield, Check, CheckCheck, FileIcon, Square, Smile, Loader2, Trash2, ShieldCheck, Users, Link as LinkIcon, Crown } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

import { supabase } from '@/lib/supabase';

import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useFileUpload } from '@/hooks/useFileUpload';

export default function ChatThreadPage() {
  const params = useParams();
  const conversationId = params.id as string;
  const router = useRouter();

  const { session: authSession, userId: currentUserId, user: authUser } = useAuthStore();

  const [otherUser, setOtherUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [conversation, setConversation] = useState<any>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  const { uploading, handleFileUpload: uploadFileHook, uploadToS3 } = useFileUpload(currentUserId || null);
  
  const handleVoiceNoteUpload = async (blob: Blob, ext: string) => {
    try {
      const mimeType = blob.type || 'audio/webm';
      const downloadUrl = await uploadToS3(blob, mimeType);
      await handleSendMessage({ preventDefault: () => {} } as any, downloadUrl, 'Voice Note 🎤');
    } catch (err) {
      console.error('Error uploading voice note:', err);
      alert('Failed to send voice note');
    }
  };

  const {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
    formatDuration
  } = useAudioRecorder(handleVoiceNoteUpload);



  useEffect(() => {
    const init = async () => {
      if (!authSession || !currentUserId) {
        router.push('/login');
        return;
      }

      // Load conversation details from our backend
      try {
        const { data: convData, error: convErr } = await supabase
          .from('conversations')
          .select(`
            *,
            conversation_members!inner(
              user_id,
              users (
                id, username, display_name, avatar_url
              )
            )
          `)
          .eq('id', conversationId)
          .single();
        
        if (convErr || !convData) {
          router.push('/messages');
          return;
        }

        const members = convData.conversation_members.map((m: any) => m.users);
        const conv = { ...convData, members };

        if (conv.type === 'group') {
          toast.error('Group messaging is temporarily disabled pending security review.');
          router.push('/messages');
          return;
        }

        setConversation(conv);
        const other = conv.members.find((m: any) => m.id !== currentUserId);
        setOtherUser(other);
        
        await loadMessages(other.id);

        // Mark conversation as read
        try {
          // Find unread messages from this sender in this conversation and mark them read
          await supabase
            .from('messages')
            .update({ read_at: new Date().toISOString() })
            .eq('conversation_id', conversationId)
            .eq('sender_id', other.id)
            .is('read_at', null);
        } catch (e) {
          console.error('Failed to mark conversation read', e);
        }

        setLoading(false);
      } catch (err) {
        console.error('Failed to load conversation details', err);
        setLoading(false);
      }
    };

    init();
  }, [conversationId, authSession, currentUserId, router]);

  useEffect(() => {
    if (!currentUserId || !conversationId) return;

    const channel = supabase
      .channel(`room:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, async (payload) => {
        const msg = payload.new;
        
        const newMsg = {
          id: msg.id,
          conversationId: msg.conversation_id,
          senderId: msg.sender_id,
          plaintext: msg.content || '[Empty message]',
          mediaUrl: msg.media_url || null,
          contentType: msg.media_url ? 'attachment' : 'text',
          status: 'sent',
          sentAt: new Date(msg.sent_at),
          readAt: msg.read_at ? new Date(msg.read_at) : null
        };
        
        setMessages(prev => {
          // Prevent duplicates
          if (prev.some(m => m.id === newMsg.id)) return prev;
          // Sort is maintained by inserting at end, but we can sort just in case
          const next = [...prev, newMsg];
          return next.sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
        });

        if (msg.sender_id !== currentUserId) {
          supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', msg.id).then();
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, async (payload) => {
        const msg = payload.new;
        if (msg.read_at) {
          setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, readAt: new Date(msg.read_at) } : m));
        }
      })
      .subscribe();

    channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (payload.userId !== currentUserId) {
        setIsTyping(payload.isTyping);
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);

  // Scroll to bottom whenever messages list changes
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    };
    const timeoutId = setTimeout(scrollToBottom, 150);
    return () => clearTimeout(timeoutId);
  }, [messages, isTyping]);

  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  async function loadMessages(recipientId: string) {
    try {
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('sent_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      const mData = messagesData.reverse();
      
      const newMessages = mData.map(m => ({
        id: m.id,
        conversationId: m.conversation_id,
        senderId: m.sender_id,
        plaintext: m.content || '[Empty message]',
        mediaUrl: m.media_url || null,
        contentType: (m.media_url ? 'attachment' : 'text') as 'text' | 'media' | 'attachment',
        status: 'sent' as const,
        sentAt: new Date(m.sent_at),
        readAt: m.read_at ? new Date(m.read_at) : null
      }));

      setMessages(newMessages);
      
      // Simple pagination logic using sent_at
      setHasMore(mData.length === 20);
      if (mData.length > 0) {
        setNextCursor(mData[0].sent_at); // oldest message we loaded
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  }

  const loadMoreMessages = async () => {
    if (!hasMore || loadingMore || !nextCursor) return;
    
    setLoadingMore(true);
    try {
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .lt('sent_at', nextCursor)
        .order('sent_at', { ascending: false })
        .limit(20);
        
      if (error) throw error;
      
      const mData = messagesData.reverse();

      const newMessages = mData.map(m => ({
        id: m.id,
        conversationId: m.conversation_id,
        senderId: m.sender_id,
        plaintext: m.content || '[Empty message]',
        mediaUrl: m.media_url || null,
        contentType: (m.media_url ? 'attachment' : 'text') as 'text' | 'media' | 'attachment',
        status: 'sent' as const,
        sentAt: new Date(m.sent_at),
        readAt: m.read_at ? new Date(m.read_at) : null
      }));

      setMessages(prev => {
        // filter out duplicates just in case
        const existingIds = new Set(prev.map(p => p.id));
        const filteredNew = newMessages.filter(n => !existingIds.has(n.id));
        return [...filteredNew, ...prev];
      });
      
      setHasMore(mData.length === 20);
      if (mData.length > 0) {
        setNextCursor(mData[0].sent_at);
      }
    } catch (err) {
      console.error('Error loading more messages:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    if (target.scrollTop === 0) {
      loadMoreMessages();
    }
  };

  const lastTypingTimeRef = useRef<number>(0);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    
    if (otherUser?.id) {
      const now = Date.now();
      if (now - lastTypingTimeRef.current > 2000) {
        supabase.channel(`room:${conversationId}`).send({ type: 'broadcast', event: 'typing', payload: { userId: currentUserId, isTyping: true } });
        lastTypingTimeRef.current = now;
        
        // Auto-stop typing after 3 seconds of inactivity
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          supabase.channel(`room:${conversationId}`).send({ type: 'broadcast', event: 'typing', payload: { userId: currentUserId, isTyping: false } });
          lastTypingTimeRef.current = 0;
        }, 3000);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent, mediaUrl?: string, overrideContent?: string) => {
    e.preventDefault();
    const content = overrideContent || inputText.trim();
    if (!content && !mediaUrl) return;

    setInputText('');

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      conversationId: conversationId,
      senderId: currentUserId as string,
      plaintext: content,
      mediaUrl: mediaUrl || null,
      contentType: (mediaUrl ? 'attachment' : 'text') as 'text' | 'media' | 'attachment',
      status: 'sending' as const,
      sentAt: new Date(),
    };
    
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const { data, error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: content,
        media_url: mediaUrl || null,
        content_type: mediaUrl ? 'attachment' : 'text'
      }).select().single();

      if (error) throw new Error(error.message);
      
      setMessages(prev => prev.map(m => m.id === tempId ? {
        ...m,
        id: data.id,
        status: 'sent',
        sentAt: new Date(data.sent_at)
      } : m));
    } catch (err) {
      console.error('Error sending message:', err);
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'error' } : m));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | File) => {
    const file = 'target' in e ? e.target.files?.[0] : e;
    if (!file || !authSession) return;

    try {
      const downloadUrl = await uploadFileHook(file);
      await handleSendMessage({ preventDefault: () => {} } as any, downloadUrl, 'Attachment 📎');
    } catch (err) {
      console.error('File upload error:', err);
      alert('Failed to upload file');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-base">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--color-background)] relative overflow-hidden select-none">
      {/* Header */}
      <div className="bg-[var(--color-surface)] px-4 py-3 border-b border-[var(--color-outline-variant)] flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/messages')}
            className="md:hidden p-1.5 rounded-xl text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div 
            onClick={() => router.push(`/profile/${otherUser?.id}`)}
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          >
            {/* Avatar */}
            <div className="relative">
              <div className="w-10 h-10 squircle bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold overflow-hidden ">
                {otherUser?.avatarUrl ? (
                  <img src={otherUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  otherUser?.displayName?.[0]?.toUpperCase() || otherUser?.username?.[0]?.toUpperCase() || '?'
                )}
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
            </div>

            {/* User Info */}
            <div className="flex flex-col select-none">
              <div className="font-bold text-sm text-[var(--color-on-surface)] leading-tight">
                {otherUser?.displayName || otherUser?.username}
              </div>
              <div className="text-[10px] font-bold text-[var(--color-on-surface-variant)] mt-0.5 flex items-center gap-1">
                {isTyping ? (
                  <span className="text-[var(--color-primary)] animate-pulse">typing...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-3 h-3 text-green-500" />
                    <span>Encrypted Connection</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Call Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('guff-start-call', {
              detail: { conversationId, callType: 'audio', otherUser }
            }))}
            className="p-2.5 rounded-xl text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary)] transition-all cursor-pointer"
          >
            <Phone className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('guff-start-call', {
              detail: { conversationId, callType: 'video', otherUser }
            }))}
            className="p-2.5 rounded-xl text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary)] transition-all cursor-pointer"
          >
            <Video className="w-4.5 h-4.5" />
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-2.5 rounded-xl text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] transition-all cursor-pointer"
            >
              <MoreVertical className="w-4.5 h-4.5" />
            </button>
            {showDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)}></div>
                <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--color-surface-container-high)] shadow-xl py-2 z-50 border border-[var(--color-outline-variant)] overflow-hidden">
                  <button 
                    onClick={() => {
                      setShowDropdown(false);
                      router.push(`/profile/${otherUser?.id}`);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)] transition-colors"
                  >
                    View Profile
                  </button>

                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--color-background)]" onScroll={handleScroll}>
        {loadingMore && (
          <div className="flex justify-center py-2">
            <Loader2 className="w-5 h-5 animate-spin text-[var(--color-primary)]" />
          </div>
        )}
        {messages.length === 0 ? (
          <div className="text-center py-20 select-none">
            <span className="text-4xl animate-bounce inline-block">👋</span>
            <h4 className="font-semibold text-sm text-[var(--color-on-surface)] mt-3">Say hello!</h4>
            <p className="text-xs text-[var(--color-on-surface-variant)] mt-1">Start your end-to-end encrypted conversation with @{otherUser?.username}</p>
          </div>
        ) : (
          messages.map((m) => {
            const isSelf = m.senderId === currentUserId;
            const timeFormatted = m.sentAt ? format(new Date(m.sentAt), 'h:mm a') : '';
            const isRead = !!m.readAt;

            return (
              <div key={m.id} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] md:max-w-[70%] p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.08)] text-sm leading-relaxed break-words
                  ${isSelf 
                    ? 'bg-[var(--color-primary)] text-white rounded-[20px] rounded-tr-[4px]' 
                    : 'bg-[var(--color-surface-container)] text-[var(--color-on-surface)] rounded-[20px] rounded-tl-[4px] border border-[var(--color-outline-variant)]'}`}
                >
                  {/* Media attachment */}
                  {m.mediaUrl && (
                    <div className="mb-2 max-w-xs rounded-xl overflow-hidden">
                      {m.plaintext === 'Voice Note 🎤' || m.mediaUrl.match(/\.(mp3|wav|ogg|webm|m4a|aac|mp4)(\?|$)/i) ? (
                        <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm border border-black/5">
                          <audio src={m.mediaUrl} controls className="w-full h-10 min-w-[200px] max-w-[240px] focus:outline-none rounded-lg" />
                        </div>
                      ) : (
                        <img src={m.mediaUrl} alt="" className="max-h-48 object-cover w-full rounded-xl border border-black/5" />
                      )}
                    </div>
                  )}

                  {m.plaintext && m.plaintext !== 'Voice Note 🎤' && m.plaintext !== 'Attachment 📎' && (
                    <div className="font-sans">
                      <p>{m.plaintext}</p>
                    </div>
                  )}
                </div>

                {/* Message Meta Info */}
                <div className="flex items-center gap-1 mt-1.5 px-1.5 text-[9px] font-bold text-[var(--color-on-surface-variant)] select-none">
                  <span>{timeFormatted}</span>
                  {isSelf && (
                    <span>
                      {m.status === 'sending' ? (
                        <Loader2 className="w-3 h-3 text-[var(--color-outline-variant)] animate-spin" />
                      ) : m.status === 'error' ? (
                        <span className="text-red-500">Failed</span>
                      ) : isRead ? (
                        <CheckCheck className="w-3.5 h-3.5 text-[var(--color-primary)] stroke-[2.5]" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-[var(--color-outline-variant)] stroke-[2.5]" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input Composer Panel */}
      <div className="bg-[var(--color-surface)] p-4 border-t border-[var(--color-outline-variant)] flex items-center gap-3 relative z-10">
        {isRecording ? (
          <div className="flex-grow flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-full px-4 py-2 select-none">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
            <span className="text-xs font-bold text-red-500">Recording {formatDuration(recordingDuration)}</span>
            
            <button
              type="button"
              onClick={cancelRecording}
              className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors ml-auto flex items-center justify-center cursor-pointer"
            >
              <Trash2 className="w-4.5 h-4.5" />
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="p-2.5 rounded-full bg-green-500 hover:bg-green-500/80 text-white shadow transition-colors flex items-center justify-center cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => handleSendMessage(e)} className="w-full flex items-center gap-3 select-none">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="p-2.5 rounded-full text-[var(--color-outline-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary)] transition-colors flex-shrink-0 cursor-pointer"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin text-[var(--color-primary)]" />
              ) : (
                <Paperclip className="w-5 h-5" />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*,audio/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />

            <div className="flex-grow bg-[var(--color-surface-container-lowest)] rounded-full px-4 py-2 flex items-center gap-2 border border-[var(--color-outline-variant)] focus-within:border-[var(--color-primary)] transition-all">
              <input
                type="text"
                value={inputText}
                onChange={handleInputChange}
                onPaste={(e) => {
                  if (e.clipboardData.files && e.clipboardData.files.length > 0) {
                    e.preventDefault();
                    handleFileUpload(e.clipboardData.files[0]);
                  }
                }}
                placeholder="Secure message..."
                className="flex-grow bg-transparent border-none focus:ring-0 text-xs py-1.5 outline-none text-[var(--color-on-surface)]"
                disabled={uploading}
              />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-1 rounded-full text-[var(--color-outline-variant)] hover:text-[var(--color-primary)] transition-colors focus:outline-none"
                >
                  <Smile className="w-5 h-5" />
                </button>
                {showEmojiPicker && (
                  <div className="absolute bottom-10 right-0 z-50 shadow-xl rounded-lg">
                    <Picker 
                      data={data} 
                      onEmojiSelect={(emoji: any) => {
                        setInputText(prev => prev + emoji.native);
                        setShowEmojiPicker(false);
                      }}
                      theme="dark"
                      previewPosition="none"
                      skinTonePosition="none"
                    />
                  </div>
                )}
              </div>
            </div>

            {!inputText.trim() && !uploading ? (
              <button
                type="button"
                onClick={startRecording}
                className="p-2.5 rounded-full text-[var(--color-outline-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)] transition-colors flex-shrink-0 cursor-pointer"
              >
                <Mic className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={uploading || (!inputText.trim())}
                className="p-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-container)] text-white rounded-full flex items-center justify-center flex-shrink-0 shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4 fill-current" />
              </button>
            )}
          </form>
        )}
      </div>


    </div>
  );
}
