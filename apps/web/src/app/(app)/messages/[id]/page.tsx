"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, Send, Paperclip, Image as ImageIcon, Loader2, Check, CheckCheck, Phone, Video, Mic, Trash2, ShieldCheck, MoreVertical } from 'lucide-react';

export default function ChatThreadPage() {
  const params = useParams();
  const conversationId = params.id as string;
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Broadcaster channels
  const broadcastChannelRef = useRef<any>(null);

  // Voice note recorder state & refs
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 0) {
          await uploadVoiceNote(audioBlob);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error starting audio recording:', err);
      alert('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const uploadVoiceNote = async (blob: Blob) => {
    setUploading(true);
    try {
      const filename = `${session.user.id}-${Date.now()}.webm`;
      const file = new File([blob], filename, { type: 'audio/webm' });

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filename);

      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: session.user.id,
          content: 'Voice Note 🎤',
          media_url: publicUrl,
        });

      if (msgError) throw msgError;
    } catch (err) {
      console.error('Error uploading voice note:', err);
      alert('Failed to send voice note');
    } finally {
      setUploading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) return;
      setSession(currentSession);

      // Load conversation details
      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .select(`
          participant_1(id, username, display_name, avatar_url),
          participant_2(id, username, display_name, avatar_url)
        `)
        .eq('id', conversationId)
        .single();

      if (convError || !conv) {
        console.error('Error loading conversation:', convError);
        router.push('/messages');
        return;
      }

      // Identify other user
      const other = (conv as any).participant_1.id === currentSession.user.id ? (conv as any).participant_2 : (conv as any).participant_1;
      setOtherUser(other);

      // Load messages
      await loadMessages(currentSession.user.id);
      setLoading(false);

      // Mark existing messages as read
      await markAsRead(currentSession.user.id);
    };

    init();

    // Subscribe to new messages & updates
    const messageSub = supabase
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new;
            setMessages(prev => {
              // Prevent duplicate insertions
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });

            // Mark as read if user is active in this window
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (currentSession && newMsg.sender_id !== currentSession.user.id) {
              await markAsRead(currentSession.user.id);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedMsg = payload.new;
            setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
          }
        }
      )
      .subscribe();

    // Setup broadcast channel for typing indicators
    const broadcastChan = supabase.channel(`typing-${conversationId}`);
    broadcastChannelRef.current = broadcastChan;
    
    broadcastChan
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId !== session?.user?.id) {
          setTypingUser(payload.username);
          setIsTyping(true);
          
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            setTypingUser(null);
          }, 3000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messageSub);
      if (broadcastChan) supabase.removeChannel(broadcastChan);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [conversationId]);

  // Scroll to bottom whenever messages list changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  async function loadMessages(userId: string) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  async function markAsRead(userId: string) {
    try {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .is('read_at', null);
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const sendTypingEvent = () => {
    if (!broadcastChannelRef.current || !session) return;
    broadcastChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId: session.user.id,
        username: session.user.user_metadata?.username || 'Someone'
      }
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    sendTypingEvent();
  };

  const handleSendMessage = async (e: React.FormEvent, mediaUrl?: string) => {
    e.preventDefault();
    if (!inputText.trim() && !mediaUrl) return;

    const messageContent = inputText.trim();
    setInputText('');

    try {
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: session.user.id,
        content: messageContent,
        media_url: mediaUrl || null
      });

      if (error) throw error;
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session) return;

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${conversationId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(path);

      // Send message with the media attachment
      await handleSendMessage({ preventDefault: () => {} } as any, publicUrl);
    } catch (err) {
      console.error('File upload error:', err);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-guff-primary)]" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--color-guff-surface)] relative overflow-hidden select-none">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-[var(--color-guff-border)]/40 flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/messages')}
            className="md:hidden p-1.5 rounded-xl text-[var(--color-guff-text-secondary)] hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Avatar with Squircle wrapper */}
          <div className="relative">
            <div className="w-10 h-10 squircle bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-sm font-bold overflow-hidden">
              {otherUser?.avatar_url ? (
                <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                otherUser?.username?.[0]?.toUpperCase() || '?'
              )}
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
          </div>

          {/* User Info */}
          <div className="flex flex-col select-none">
            <div className="font-bold text-sm text-[var(--color-guff-text)] leading-tight">
              {otherUser?.display_name || otherUser?.username}
            </div>
            <div className="text-[10px] font-bold text-[var(--color-guff-text-muted)] mt-0.5 flex items-center gap-1">
              {isTyping ? (
                <span className="text-[var(--color-guff-primary)] animate-pulse">typing...</span>
              ) : (
                <>
                  <ShieldCheck className="w-3 h-3 text-[var(--color-guff-success)]" />
                  <span>Encrypted Connection</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Call Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('guff-start-call', {
              detail: { conversationId, callType: 'audio', otherUser }
            }))}
            className="p-2.5 rounded-xl text-[var(--color-guff-text-secondary)] hover:bg-slate-50 hover:text-[var(--color-guff-primary)] transition-all cursor-pointer"
          >
            <Phone className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('guff-start-call', {
              detail: { conversationId, callType: 'video', otherUser }
            }))}
            className="p-2.5 rounded-xl text-[var(--color-guff-text-secondary)] hover:bg-slate-50 hover:text-[var(--color-guff-primary)] transition-all cursor-pointer"
          >
            <Video className="w-4.5 h-4.5" />
          </button>
          <button className="p-2.5 rounded-xl text-[var(--color-guff-text-secondary)] hover:bg-slate-50 transition-all cursor-pointer">
            <MoreVertical className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--color-guff-surface)]">
        {messages.length === 0 ? (
          <div className="text-center py-20 select-none">
            <span className="text-4xl animate-bounce inline-block">👋</span>
            <h4 className="font-semibold text-sm text-[var(--color-guff-text)] mt-3">Say hello!</h4>
            <p className="text-xs text-[var(--color-guff-text-muted)] mt-1">Start your end-to-end encrypted conversation with @{otherUser?.username}</p>
          </div>
        ) : (
          messages.map((m) => {
            const isSelf = m.sender_id === session?.user?.id;
            const timeFormatted = m.created_at ? format(new Date(m.created_at), 'h:mm a') : '';
            const isRead = !!m.read_at;

            return (
              <div key={m.id} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] md:max-w-[70%] p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.08)] text-sm leading-relaxed break-words
                  ${isSelf 
                    ? 'bg-[var(--color-guff-primary)] text-white rounded-[20px] rounded-tr-[4px]' 
                    : 'bg-white text-[var(--color-guff-text)] rounded-[20px] rounded-tl-[4px] border border-slate-100'}`}
                >
                  {/* Media attachment */}
                  {m.media_url && (
                    <div className="mb-2 max-w-xs rounded-xl overflow-hidden border border-black/5">
                      {m.media_url.match(/\.(mp3|wav|ogg|webm|m4a|aac)(\?|$)/i) ? (
                        <audio src={m.media_url} controls className="w-full max-w-[240px] focus:outline-none" />
                      ) : (
                        <img src={m.media_url} alt="" className="max-h-48 object-cover w-full rounded-xl" />
                      )}
                    </div>
                  )}

                  {/* Text content */}
                  {m.content && <p className="font-sans">{m.content}</p>}
                </div>

                {/* Message Meta Info */}
                <div className="flex items-center gap-1 mt-1.5 px-1.5 text-[9px] font-bold text-[var(--color-guff-text-muted)] select-none">
                  <span>{timeFormatted}</span>
                  {isSelf && (
                    <span>
                      {isRead ? (
                        <CheckCheck className="w-3.5 h-3.5 text-[var(--color-guff-primary)] stroke-[2.5]" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-slate-300 stroke-[2.5]" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Live typing indicator bubble */}
        {isTyping && (
          <div className="flex items-end gap-2 mt-2 select-none">
            <div className="w-8 h-8 squircle bg-gradient-to-br from-indigo-300 to-purple-300 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden flex-shrink-0">
              {otherUser?.username?.[0]?.toUpperCase()}
            </div>
            <div className="bg-white rounded-[20px] rounded-tl-[4px] px-4 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.08)] border border-slate-100">
              <span className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-[var(--color-guff-text-secondary)]">{typingUser} is typing</span>
                <span className="flex gap-0.5 items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer Panel */}
      <div className="bg-white p-4 border-t border-[var(--color-guff-border)]/40 flex items-center gap-3 relative z-10">
        {isRecording ? (
          <div className="flex-grow flex items-center gap-3 bg-red-50/50 border border-red-100 rounded-full px-4 py-2 select-none">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse flex-shrink-0" />
            <span className="text-xs font-bold text-red-600">Recording {formatDuration(recordingDuration)}</span>
            
            <button
              type="button"
              onClick={cancelRecording}
              className="p-2 rounded-xl text-rose-600 hover:bg-rose-100/50 transition-colors ml-auto flex items-center justify-center cursor-pointer"
            >
              <Trash2 className="w-4.5 h-4.5" />
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="p-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow transition-colors flex items-center justify-center cursor-pointer"
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
              className="p-2.5 rounded-full text-[var(--color-guff-text-muted)] hover:bg-slate-50 hover:text-[var(--color-guff-primary)] transition-colors flex-shrink-0 cursor-pointer"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin text-[var(--color-guff-primary)]" />
              ) : (
                <Paperclip className="w-5 h-5" />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />

            <div className="flex-grow bg-[var(--color-guff-surface-container-low)] rounded-full px-4 py-2 flex items-center gap-2 border border-transparent focus-within:border-[var(--color-guff-primary)]/20 focus-within:bg-white transition-all">
              <button 
                type="button"
                className="p-1 rounded-full text-[var(--color-guff-text-muted)] hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm-3.5-9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm7 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm-3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                </svg>
              </button>
              <input
                type="text"
                value={inputText}
                onChange={handleInputChange}
                placeholder="Secure message..."
                className="flex-grow bg-transparent border-none focus:ring-0 text-xs py-1.5 outline-none text-[var(--color-guff-text)]"
                disabled={uploading}
              />
            </div>

            {!inputText.trim() && !uploading ? (
              <button
                type="button"
                onClick={startRecording}
                className="p-2.5 rounded-full text-[var(--color-guff-text-muted)] hover:bg-slate-50 hover:text-[var(--color-guff-text)] transition-colors flex-shrink-0 cursor-pointer"
              >
                <Mic className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={uploading || (!inputText.trim())}
                className="p-3 bg-[var(--color-guff-primary)] hover:bg-[var(--color-guff-primary-hover)] text-white rounded-full flex items-center justify-center flex-shrink-0 shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
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
