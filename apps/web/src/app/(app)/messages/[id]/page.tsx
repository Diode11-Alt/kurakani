"use client";

import { useState, useEffect, useRef } from "react";

import { useParams, useRouter } from "next/navigation";
import { format, isToday, isYesterday } from "date-fns";
import {
  ArrowLeft,
  Phone,
  Video,
  MoreVertical,
  Send,
  Paperclip,
  Mic,
  Shield,
  Check,
  CheckCheck,
  FileIcon,
  Square,
  Smile,
  Loader2,
  Trash2,
  ShieldCheck,
  Users,
  Link as LinkIcon,
  Crown,
  Copy,
  Reply,
  Forward,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import toast from "react-hot-toast";
import { db } from "@/lib/db";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

import { supabase } from "@/lib/supabase";

import SecureMediaRenderer from "@/components/chat/SecureMediaRenderer";
import ChatInfoSidebar from "@/components/chat/ChatInfoSidebar";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useFileUpload } from "@/hooks/useFileUpload";
import { sanitizeMessage } from "@/lib/sanitize";

const formatMessageDate = (date: Date) => {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMMM d, yyyy");
};

export default function ChatThreadPage() {
  const params = useParams();
  const conversationId = params.id as string;
  const router = useRouter();

  const {
    session: authSession,
    userId: currentUserId,
    user: authUser,
  } = useAuthStore();
  const { onlineUsers } = useUIStore();

  const [otherUser, setOtherUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [conversation, setConversation] = useState<any>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<any>(null);

  // Search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingDb, setIsSearchingDb] = useState(false);
  const [isInfoPaneOpen, setIsInfoPaneOpen] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    messageId: string;
    isSelf: boolean;
    hasText: boolean;
  } | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  const {
    uploading,
    handleFileUpload: uploadFileHook,
    uploadToS3,
  } = useFileUpload(currentUserId || null);

  const handleVoiceNoteUpload = async (blob: Blob, ext: string) => {
    try {
      const mimeType = blob.type || "audio/webm";
      const downloadUrl = await uploadToS3(blob, mimeType);
      await handleSendMessage(
        { preventDefault: () => {} } as any,
        downloadUrl,
        "Voice Note 🎤",
      );
    } catch (err) {
      console.error("Error uploading voice note:", err);
      toast.error("Failed to send voice note");
    }
  };

  const {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
    formatDuration,
  } = useAudioRecorder(handleVoiceNoteUpload);

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!currentUserId) return;
    try {
      const msg = messages.find((m) => m.id === messageId);
      const existing = msg?.reactions?.find(
        (r: any) => r.user_id === currentUserId && r.emoji === emoji,
      );

      // Optimistic update
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          let newReactions = [...(m.reactions || [])];
          if (existing) {
            newReactions = newReactions.filter(
              (r: any) => r.id !== existing.id,
            );
          } else {
            newReactions.push({
              id: `temp-${Date.now()}`,
              message_id: messageId,
              user_id: currentUserId,
              emoji,
            });
          }
          return { ...m, reactions: newReactions };
        }),
      );
      setHoveredMessageId(null);

      if (existing) {
        await supabase.from("message_reactions").delete().eq("id", existing.id);
      } else {
        await supabase.from("message_reactions").insert({
          message_id: messageId,
          user_id: currentUserId,
          emoji,
        });
      }
    } catch (err) {
      console.error("Error toggling reaction", err);
    }
  };

  useEffect(() => {
    const init = async () => {
      if (!authSession || !currentUserId) {
        router.push("/login");
        return;
      }

      // Load conversation details from our backend
      try {
        const { data: convData, error: convErr } = await supabase
          .from("conversations")
          .select(
            `
            *,
            conversation_members!inner(
              user_id,
              users (
                id, username, display_name, avatar_url
              )
            )
          `,
          )
          .eq("id", conversationId)
          .maybeSingle();

        if (convErr || !convData) {
          console.error("Failed to load conversation from Supabase:", convErr);
          
          // If it doesn't exist on the server, it might be a stale local cache. Delete it.
          try {
            await db.local_conversations.delete(conversationId);
          } catch (e) {
            console.error("Failed to delete stale conversation from local DB", e);
          }

          toast.error("Conversation not found");
          router.push("/messages");
          return;
        }

        const members = convData.conversation_members.map((m: any) => m.users);
        const conv = { ...convData, members };

        if (conv.type === "group") {
          toast.error(
            "Group messaging is temporarily disabled pending security review.",
          );
          router.push("/messages");
          return;
        }

        setConversation(conv);
        const rawOther = conv.members.find((m: any) => m.id !== currentUserId);
        const other = rawOther ? {
          ...rawOther,
          displayName: rawOther.display_name,
          avatarUrl: rawOther.avatar_url,
        } : null;
        setOtherUser(other);

        await loadMessages();

        // Mark conversation as read
        try {
          // Find unread messages from this sender in this conversation and mark them read
          await supabase
            .from("messages")
            .update({ read_at: new Date().toISOString() })
            .eq("conversation_id", conversationId)
            .eq("sender_id", other.id)
            .is("read_at", null);
        } catch (e) {
          console.error("Failed to mark conversation read", e);
        }

        setLoading(false);
      } catch (err) {
        console.error("Failed to load conversation details", err);
        setLoading(false);
      }
    };

    init();
  }, [conversationId, authSession, currentUserId, router]);

  // Mark messages as read
  useEffect(() => {
    if (!currentUserId || !conversationId) return;

    const markConversationRead = async () => {
      try {
        await supabase
          .from("messages")
          .update({ read_at: new Date().toISOString() })
          .eq("conversation_id", conversationId)
          .neq("sender_id", currentUserId)
          .is("read_at", null);
      } catch (e) {
        console.error("Failed to mark conversation read", e);
      }
    };

    const markConversationDelivered = async () => {
      try {
        await supabase
          .from("messages")
          .update({ delivered_at: new Date().toISOString() })
          .eq("conversation_id", conversationId)
          .neq("sender_id", currentUserId)
          .is("delivered_at", null);
      } catch (e) {
        console.error("Failed to mark conversation delivered", e);
      }
    };

    markConversationDelivered();
    markConversationRead();
    if (!isSearching) {
      loadMessages();
    }
  }, [conversationId, currentUserId, isSearching]);

  useEffect(() => {
    if (!currentUserId || !conversationId) return;

    const channel = supabase
      .channel(`room:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const msg = payload.new;

          const newMsg = {
            id: msg.id,
            conversationId: msg.conversation_id,
            senderId: msg.sender_id,
            plaintext: sanitizeMessage(msg.content || "[Empty message]"),
            mediaUrl: msg.media_url || null,
            attachmentKey: null,
            attachmentIv: null,
            contentType: msg.content_type === "call_log" ? "call_log" : (msg.media_url ? "attachment" : "text"),
            status: "sent",
            sentAt: new Date(msg.sent_at),
            deliveredAt: msg.delivered_at ? new Date(msg.delivered_at) : null,
            readAt: msg.read_at ? new Date(msg.read_at) : null,
            replyToMessageId: msg.reply_to_message_id || null,
            reactions: msg.message_reactions || [],
          };

          setMessages((prev) => {
            // Prevent duplicates
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            // Sort is maintained by inserting at end, but we can sort just in case
            const next = [...prev, newMsg];
            return next.sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
          });

          if (msg.sender_id !== currentUserId) {
            supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", msg.id)
              .then();
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const msg = payload.new;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msg.id
                ? {
                    ...m,
                    deliveredAt: msg.delivered_at
                      ? new Date(msg.delivered_at)
                      : m.deliveredAt,
                    readAt: msg.read_at ? new Date(msg.read_at) : m.readAt,
                  }
                : m,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_reactions" },
        (payload) => {
          const reaction = payload.new;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === reaction.message_id
                ? {
                    ...m,
                    reactions: [
                      ...(m.reactions || []).filter(
                        (r: any) =>
                          !(
                            r.user_id === reaction.user_id &&
                            r.emoji === reaction.emoji
                          ),
                      ),
                      reaction,
                    ],
                  }
                : m,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "message_reactions" },
        (payload) => {
          const reactionId = payload.old.id;
          setMessages((prev) =>
            prev.map((m) => ({
              ...m,
              reactions: (m.reactions || []).filter(
                (r: any) => r.id !== reactionId,
              ),
            })),
          );
        },
      )
      .subscribe();

    channel.on("broadcast", { event: "typing" }, ({ payload }) => {
      if (payload.userId !== currentUserId) {
        setIsTyping(payload.isTyping);
        setTypingUser(payload.isTyping && payload.userId === otherUser?.id ? otherUser?.username || 'Someone' : null);
      }
    });

    return () => {
      // BUG-013 Fix: Ensure channel is unsubscribed before removal to prevent memory leak
      channel.unsubscribe().then(() => {
        supabase.removeChannel(channel);
      });
    };
  }, [conversationId, currentUserId]);

  const isNearBottomRef = useRef(true);

  // Scroll to bottom whenever messages list changes
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current && isNearBottomRef.current) {
        messagesEndRef.current.scrollIntoView({
          behavior: "auto",
          block: "end",
        });
      }
    };
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages.length, isTyping]);

  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  // Load initial messages
  const loadMessages = async () => {
    try {
      if (isSearching && searchQuery.trim()) {
        await executeSearch(searchQuery);
        return;
      }

      setLoading(true);
      const { data: messagesData, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("sent_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      let allReactions: any[] = [];
      if (messagesData && messagesData.length > 0) {
        const messageIds = messagesData.map((m) => m.id);
        const { data: reactionsData } = await supabase
          .from("message_reactions")
          .select("*")
          .in("message_id", messageIds);
        if (reactionsData) {
          allReactions = reactionsData;
        }
      }

      const mData = messagesData.reverse();

      const newMessages = await Promise.all(mData.map(async (m) => {
        const messageReactions = allReactions.filter(
          (r) => r.message_id === m.id,
        );

        return {
          id: m.id,
          conversationId: m.conversation_id,
          senderId: m.sender_id,
          plaintext: sanitizeMessage(m.content || (m.media_url ? "" : "[Empty message]")),
          mediaUrl: m.media_url || null,
          attachmentKey: null,
          attachmentIv: null,
          contentType: (m.content_type === "call_log" ? "call_log" : (m.media_url ? "attachment" : "text")) as
            | "text"
            | "media"
            | "attachment"
            | "call_log",
          status: "sent" as const,
          sentAt: new Date(m.sent_at),
          deliveredAt: m.delivered_at ? new Date(m.delivered_at) : null,
          readAt: m.read_at ? new Date(m.read_at) : null,
          replyToMessageId: m.reply_to_message_id || null,
          reactions: messageReactions || [],
        };
      }));

      setMessages(newMessages);

      // Simple pagination logic using sent_at
      setHasMore(mData.length === 20);
      if (mData.length > 0) {
        setNextCursor(mData[0].sent_at); // oldest message we loaded
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreMessages = async () => {
    if (!hasMore || loadingMore || !nextCursor) return;

    setLoadingMore(true);
    const scrollContainer = scrollContainerRef.current;
    const previousScrollHeight = scrollContainer ? scrollContainer.scrollHeight : 0;
    const previousScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
    
    try {
      const { data: messagesData, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .lt("sent_at", nextCursor)
        .order("sent_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      let allReactions: any[] = [];
      if (messagesData && messagesData.length > 0) {
        const messageIds = messagesData.map((m) => m.id);
        const { data: reactionsData } = await supabase
          .from("message_reactions")
          .select("*")
          .in("message_id", messageIds);
        if (reactionsData) {
          allReactions = reactionsData;
        }
      }

      const mData = messagesData.reverse();

      const newMessages = mData.map((m) => {
        const messageReactions = allReactions.filter(
          (r) => r.message_id === m.id,
        );
        return {
          id: m.id,
          conversationId: m.conversation_id,
          senderId: m.sender_id,
          plaintext: sanitizeMessage(m.content || "[Empty message]"),
          mediaUrl: m.media_url || null,
          contentType: (m.content_type === "call_log" ? "call_log" : (m.media_url ? "attachment" : "text")) as
            | "text"
            | "media"
            | "attachment"
            | "call_log",
          status: "sent" as const,
          sentAt: new Date(m.sent_at),
          deliveredAt: m.delivered_at ? new Date(m.delivered_at) : null,
          readAt: m.read_at ? new Date(m.read_at) : null,
          replyToMessageId: m.reply_to_message_id || null,
          reactions: messageReactions || [],
        };
      });

      setMessages((prev) => {
        // filter out duplicates just in case
        const existingIds = new Set(prev.map((p) => p.id));
        const filteredNew = newMessages.filter((n) => !existingIds.has(n.id));
        return [...filteredNew, ...prev];
      });

      // Restore scroll position after React renders
      setTimeout(() => {
        if (scrollContainerRef.current) {
          const newScrollHeight = scrollContainerRef.current.scrollHeight;
          scrollContainerRef.current.scrollTop = previousScrollTop + (newScrollHeight - previousScrollHeight);
        }
      }, 0);

      setHasMore(mData.length === 20);
      if (mData.length > 0) {
        setNextCursor(mData[0].sent_at);
      }
    } catch (err) {
      console.error("Error loading more messages:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    if (target.scrollTop === 0 && hasMore && !loadingMore) {
      loadMoreMessages();
    }
  };

  const lastTypingTimeRef = useRef<number>(0);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    if (otherUser?.id) {
      const now = Date.now();
      if (now - lastTypingTimeRef.current > 2000) {
        supabase.channel(`room:${conversationId}`).send({
          type: "broadcast",
          event: "typing",
          payload: { userId: currentUserId, isTyping: true },
        });
        lastTypingTimeRef.current = now;

        // Auto-stop typing after 3 seconds of inactivity
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          supabase.channel(`room:${conversationId}`).send({
            type: "broadcast",
            event: "typing",
            payload: { userId: currentUserId, isTyping: false },
          });
          lastTypingTimeRef.current = 0;
        }, 3000);
      }
    }
  };

  const { deviceId } = useAuthStore();

  const handleSendMessage = async (
    e: React.FormEvent,
    attachmentOverride?: { s3Key: string; keyBase64: string; ivBase64: string } | string | null,
    overrideContent?: string,
  ) => {
    e.preventDefault();
    
    let finalMediaUrl = typeof attachmentOverride === 'string' ? attachmentOverride : (attachmentOverride?.s3Key || null);
    let attachmentData = typeof attachmentOverride === 'object' && attachmentOverride ? attachmentOverride : null;
    
    if (selectedFile && !finalMediaUrl) {
      try {
        const uploadResult = await uploadFileHook(selectedFile) as any;
        finalMediaUrl = uploadResult.s3Key;
        attachmentData = uploadResult;
      } catch (err) {
        console.error("File upload error:", err);
        toast.error("Failed to upload file");
        return;
      }
    }
    
    const rawContent = overrideContent || inputText.trim();
    if (!rawContent && !finalMediaUrl) return;
    if (rawContent.length > 4000) {
      toast.error('Message is too long (max 4000 characters)');
      return;
    }

    setInputText("");
    setSelectedFile(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }
    if (fileRef.current) fileRef.current.value = "";

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      conversationId: conversationId,
      senderId: currentUserId as string,
      plaintext: sanitizeMessage(rawContent),
      mediaUrl: finalMediaUrl || null,
      attachmentKey: null,
      attachmentIv: null,
      contentType: (finalMediaUrl ? "attachment" : "text") as
        | "text"
        | "media"
        | "attachment"
        | "call_log",
      status: "sending" as const,
      sentAt: new Date(),
      replyToMessageId: replyingToMessage?.id || null,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setReplyingToMessage(null);

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: rawContent,
          media_url: finalMediaUrl || null,
          ciphertext: null,
          ciphertext_type: null,
          content_type: finalMediaUrl ? "attachment" : "text",
          reply_to_message_id: optimisticMsg.replyToMessageId,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? {
                ...m,
                id: data.id,
                status: "sent",
                sentAt: new Date(data.sent_at),
              }
            : m,
        ),
      );
    } catch (err) {
      console.error("Error sending message:", err);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "error" } : m)),
      );
    }
  };

  const executeSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearchingDb(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .ilike("content", `%${query.trim().replace(/[%_\\]/g, '')}%`)
        .order("sent_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data) {
        setSearchResults(
          data.map((m) => ({
            id: m.id,
            content: m.content,
            senderId: m.sender_id,
            createdAt: new Date(m.sent_at),
            status: "sent",
            deliveredAt: m.delivered_at ? new Date(m.delivered_at) : null,
            readAt: m.read_at ? new Date(m.read_at) : null,
            type: m.message_type || "text",
            metadata: m.metadata || {},
          }))
        );
      }
    } catch (e) {
      console.error("Search error", e);
      toast.error("Failed to search messages");
    } finally {
      setIsSearchingDb(false);
    }
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement> | File,
  ) => {
    const file = "target" in e ? e.target.files?.[0] : e;
    if (!file || !authSession) return;

    setSelectedFile(file);
    
    const isImage = file.type.startsWith("image/") || file.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
    const isVideo = file.type.startsWith("video/") || file.name.match(/\.(mp4|webm|mov|mkv|avi)$/i);
    
    if (isImage || isVideo) {
      setFilePreview(URL.createObjectURL(file));
    } else {
      setFilePreview(null);
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
    <div className="flex-1 flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col h-full bg-[var(--color-background)] relative overflow-hidden select-none">
        {/* Header */}
        <div className="bg-[var(--color-surface)] px-4 py-3 border-b border-[var(--color-outline-variant)] flex items-center justify-between z-10 shadow-sm">
        {isSearching ? (
          <div className="flex items-center gap-3 w-full animate-in fade-in slide-in-from-top-2">
            <button
              onClick={() => {
                setIsSearching(false);
                setSearchQuery("");
                setSearchResults([]);
              }}
              className="p-1.5 rounded-xl text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 flex items-center bg-[var(--color-surface-container)] rounded-full px-4 py-2">
              <Search className="w-4 h-4 text-[var(--color-on-surface-variant)] mr-2" />
              <input
                type="text"
                autoFocus
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    executeSearch(searchQuery);
                  }
                }}
                className="bg-transparent border-none outline-none flex-1 text-sm text-[var(--color-on-surface)] placeholder-[var(--color-on-surface-variant)]"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <button
            onClick={() => router.push("/messages")}
            className="md:hidden p-1.5 rounded-xl text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div
            onClick={() => setIsInfoPaneOpen(!isInfoPaneOpen)}
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          >
            {/* Avatar */}
            <div className="relative">
              <div className="w-10 h-10 squircle bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold overflow-hidden ">
                {otherUser?.avatarUrl ? (
                  <img
                    src={otherUser.avatarUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  otherUser?.displayName?.[0]?.toUpperCase() ||
                  otherUser?.username?.[0]?.toUpperCase() ||
                  "?"
                )}
              </div>
              {onlineUsers[otherUser?.id] && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[var(--color-surface)] rounded-full z-10"></span>
              )}
            </div>

            {/* User Info */}
            <div className="flex flex-col select-none">
              <div className="font-bold text-sm text-[var(--color-on-surface)] leading-tight">
                {otherUser?.displayName || otherUser?.username}
              </div>
              <div className="text-[10px] font-bold text-[var(--color-on-surface-variant)] mt-0.5 flex items-center gap-1">
                {isTyping && typingUser ? (
                  <span className="text-[var(--color-guff-primary)] animate-pulse">
                    {typingUser} is typing...
                  </span>
                ) : onlineUsers[otherUser?.id] ? (
                  <span className="text-[var(--color-primary)]">Online</span>
                ) : otherUser?.last_seen ? (
                  <span>
                    Last seen {formatMessageDate(new Date(otherUser.last_seen))}{" "}
                    at {format(new Date(otherUser.last_seen), "h:mm a")}
                  </span>
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
            onClick={() => setIsSearching(true)}
            className="p-2.5 rounded-xl text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary)] transition-all cursor-pointer"
          >
            <Search className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("guff-start-call", {
                  detail: { conversationId, callType: "audio", otherUser },
                }),
              )
            }
            className="p-2.5 rounded-xl text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary)] transition-all cursor-pointer"
          >
            <Phone className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("guff-start-call", {
                  detail: { conversationId, callType: "video", otherUser },
                }),
              )
            }
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
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowDropdown(false)}
                ></div>
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
        </>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6"
        onScroll={(e) => {
          const target = e.currentTarget;
          // Track if user is near the bottom (within 150px)
          const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
          isNearBottomRef.current = distanceFromBottom < 150;

          if (!isSearching && target.scrollTop === 0 && hasMore && !loading) {
            loadMoreMessages();
          }
        }}
      >
        {isSearchingDb ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
          </div>
        ) : isSearching && searchResults.length === 0 && searchQuery ? (
          <div className="flex-1 flex items-center justify-center text-[var(--color-on-surface-variant)] text-sm py-20">
            No messages found for "{searchQuery}"
          </div>
        ) : isSearching && searchResults.length > 0 ? (
          [...searchResults].reverse().map((m, index) => {
            const isSelf = m.senderId === currentUserId;
            return (
              <div key={`search-${m.id}`} className={`flex flex-col ${isSelf ? "items-end" : "items-start"} max-w-[85%] ${isSelf ? "self-end" : "self-start"} w-full`}>
                <div className="flex items-center gap-2 text-[10px] text-[var(--color-on-surface-variant)] mb-1 px-1">
                  <span className="font-bold">{isSelf ? "You" : otherUser?.displayName || otherUser?.username}</span>
                  <span>{formatMessageDate(m.createdAt)} at {format(m.createdAt, "h:mm a")}</span>
                </div>
                <div className={`rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed shadow-sm break-words
                  ${isSelf ? "bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-variant)] text-[var(--color-on-primary)] rounded-tr-sm"
                           : "bg-[var(--color-surface-container)] text-[var(--color-on-surface)] rounded-tl-sm border border-[var(--color-outline-variant)]"}
                `}>
                  {m.content}
                </div>
              </div>
            );
          })
        ) : loadingMore && !isSearching ? (
          <div className="flex justify-center py-2">
            <Loader2 className="w-5 h-5 animate-spin text-[var(--color-primary)]" />
          </div>
        ) : null}

        {!isSearching && messages.length === 0 ? (
          <div className="text-center py-20 select-none">
            <span className="text-4xl inline-block mb-4">👋</span>
            <h4 className="font-semibold text-lg text-[var(--color-on-surface)]">
              No messages yet
            </h4>
            <p className="text-sm text-[var(--color-on-surface-variant)] mt-1 max-w-xs mx-auto">
              Start the conversation by sending a message to @
              {otherUser?.username}.
            </p>
          </div>
        ) : !isSearching && messages.map((m, index) => {
            const isSelf = m.senderId === currentUserId;
            const timeFormatted = m.sentAt
              ? format(new Date(m.sentAt), "h:mm a")
              : "";
            const isRead = !!m.readAt;
            const isDelivered = !!m.deliveredAt;

            const mDate = m.sentAt ? new Date(m.sentAt) : new Date();
            const prevDate =
              index > 0 && messages[index - 1].sentAt
                ? new Date(messages[index - 1].sentAt)
                : null;
            const isNewDay =
              !prevDate || mDate.toDateString() !== prevDate.toDateString();

            const handleContextMenu = (
              e: React.MouseEvent | React.TouchEvent,
            ) => {
              e.preventDefault();
              let clientX = 0;
              let clientY = 0;
              if ("touches" in e) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
              } else {
                clientX = (e as React.MouseEvent).clientX;
                clientY = (e as React.MouseEvent).clientY;
              }
              setContextMenu({
                x: clientX,
                y: clientY,
                messageId: m.id,
                isSelf,
                hasText: !!m.plaintext,
              });
            };
            const hasVisibleText = m.plaintext && m.plaintext !== "Voice Note 🎤" && m.plaintext !== "Attachment 📎";
            const isOnlyMedia = m.mediaUrl && !hasVisibleText && !m.replyToMessageId;

            return (
              <div key={m.id}>
                {isNewDay && (
                  <div className="flex justify-center my-6">
                    <span className="text-xs font-medium text-[var(--color-on-surface-variant)] bg-[var(--color-surface-container-low)] px-3 py-1 rounded-full border border-[var(--color-outline-variant)] shadow-sm">
                      {formatMessageDate(mDate)}
                    </span>
                  </div>
                )}

                {m.contentType === 'call_log' ? (
                  <div className="flex justify-center my-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-on-surface-variant)] bg-[var(--color-surface-container-low)] px-4 py-2 rounded-2xl border border-[var(--color-outline-variant)] shadow-sm">
                      <Phone className="w-3.5 h-3.5" />
                      {m.plaintext}
                    </div>
                  </div>
                ) : (
                  <div
                    className={`flex flex-col relative group ${isSelf ? "items-end" : "items-start"} mb-1`}
                    onMouseEnter={() => setHoveredMessageId(m.id)}
                    onMouseLeave={() => setHoveredMessageId(null)}
                  >
                  {/* Hover Reaction Picker */}
                  {hoveredMessageId === m.id && (
                    <div
                      className={`absolute top-[-36px] ${isSelf ? "right-0" : "left-0"} bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] shadow-lg rounded-full flex items-center gap-1 p-1 z-20 animate-in fade-in zoom-in duration-200`}
                    >
                      {["👍", "❤️", "😂", "😮", "😢", "👏"].map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(m.id, emoji)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-[var(--color-surface-container-highest)] rounded-full transition-transform hover:scale-125 cursor-pointer text-lg"
                        >
                          {emoji}
                        </button>
                      ))}
                      <div className="w-[1px] h-5 bg-[var(--color-outline-variant)] mx-1"></div>
                      <button
                        onClick={() => setReplyingToMessage(m)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-[var(--color-surface-container-highest)] rounded-full text-[var(--color-on-surface-variant)] cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div
                    onContextMenu={handleContextMenu}
                    className={`max-w-[85%] md:max-w-[70%] ${isOnlyMedia ? 'p-1' : 'p-3.5'} shadow-[0_1px_3px_rgba(15,23,42,0.08)] text-sm leading-relaxed break-words relative cursor-pointer
                      ${isSelf ? "msg-bubble-sent" : "msg-bubble-received"}`}
                  >
                    {/* Quoted Message */}
                    {m.replyToMessageId && (
                      <div
                        className={`mb-2 pl-3 py-1 border-l-4 rounded bg-black/5 text-xs ${isSelf ? "border-white/50 text-white/90" : "border-[var(--color-primary)] text-[var(--color-on-surface-variant)]"}`}
                      >
                        <div className="font-bold mb-0.5">
                          {messages.find((msg) => msg.id === m.replyToMessageId)
                            ?.senderId === currentUserId
                            ? "You"
                            : otherUser?.username || "User"}
                        </div>
                        <div className="truncate opacity-80">
                          {messages.find((msg) => msg.id === m.replyToMessageId)
                            ?.plaintext || "Replied to a message"}
                        </div>
                      </div>
                    )}

                    {/* Media attachment */}
                    {m.mediaUrl && (
                      <div className={`${hasVisibleText ? "mb-2" : ""} max-w-xs rounded-xl overflow-hidden`}>
                        <SecureMediaRenderer mediaUrl={m.mediaUrl} isSelf={isSelf} plaintext={m.plaintext} attachmentKey={m.attachmentKey} attachmentIv={m.attachmentIv} />
                      </div>
                    )}

                    {m.plaintext &&
                      m.plaintext !== "Voice Note 🎤" &&
                      m.plaintext !== "Attachment 📎" && (
                        <div className="font-sans">
                          <p>{m.plaintext}</p>
                        </div>
                      )}
                  </div>

                  {/* Existing Reactions Display */}
                  {m.reactions && m.reactions.length > 0 && (
                    <div
                      className={`flex flex-wrap gap-1 mt-1 ${isSelf ? "justify-end" : "justify-start"}`}
                    >
                      {Object.entries(
                        m.reactions.reduce((acc: any, r: any) => {
                          acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                          return acc;
                        }, {}),
                      ).map(([emoji, count]) => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(m.id, emoji)}
                          className={`px-1.5 py-0.5 rounded-full border text-xs flex items-center gap-1 hover:brightness-95 cursor-pointer ${
                            m.reactions.some(
                              (r: any) =>
                                r.emoji === emoji &&
                                r.user_id === currentUserId,
                            )
                              ? "bg-blue-100 border-blue-200 text-blue-800"
                              : "bg-[var(--color-surface-container)] border-[var(--color-outline-variant)] text-[var(--color-on-surface)]"
                          }`}
                        >
                          <span>{emoji}</span>
                          <span className="text-[10px] font-bold">
                            {count as number}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Message Meta Info */}
                  <div className="flex items-center gap-1 mt-1.5 px-1.5 text-[9px] font-bold text-[var(--color-on-surface-variant)] select-none">
                    <span>{timeFormatted}</span>
                    {isSelf && (
                      <span>
                        {m.status === "sending" ? (
                          <Loader2 className="w-3 h-3 text-[var(--color-outline-variant)] animate-spin" />
                        ) : m.status === "error" ? (
                          <span className="text-red-500">Failed</span>
                        ) : isRead ? (
                          <CheckCheck className="w-3.5 h-3.5 text-blue-500 stroke-[2.5]" />
                        ) : isDelivered ? (
                          <CheckCheck className="w-3.5 h-3.5 text-[var(--color-outline-variant)] stroke-[2.5]" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-[var(--color-outline-variant)] stroke-[2.5]" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
                )}
              </div>
            );
          })
        }
        {!isSearching && messages.length === 0 && !loading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-[var(--color-on-surface-variant)] text-sm">
            No messages yet. Send a message to start the conversation!
          </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input Composer Panel */}
      <div className="bg-[var(--color-surface)] p-4 border-t border-[var(--color-outline-variant)] flex flex-col gap-2 relative z-10">
        {/* Reply Preview */}
        {replyingToMessage && (
          <div className="flex items-center justify-between bg-[var(--color-surface-container-low)] p-2 rounded-xl border-l-4 border-[var(--color-primary)]">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-[var(--color-primary)]">
                Replying to{" "}
                {replyingToMessage.senderId === currentUserId
                  ? "yourself"
                  : otherUser?.username}
              </div>
              <div className="text-xs text-[var(--color-on-surface-variant)] truncate">
                {replyingToMessage.plaintext}
              </div>
            </div>
            <button
              onClick={() => setReplyingToMessage(null)}
              className="p-1 rounded-full hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* File Preview */}
        {selectedFile && (
          <div className="relative inline-block self-start bg-[var(--color-surface-container-low)] p-2 rounded-xl border border-[var(--color-outline-variant)]">
            <button
              onClick={() => {
                setSelectedFile(null);
                if (filePreview) URL.revokeObjectURL(filePreview);
                setFilePreview(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="absolute -top-2 -right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md cursor-pointer z-10"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            
            {filePreview ? (
              (selectedFile.type.startsWith("video/") || selectedFile.name.match(/\.(mp4|webm|mov|mkv|avi)$/i)) ? (
                <div className="relative bg-black rounded-lg overflow-hidden border border-black/10 group max-h-32">
                  <video src={filePreview} className="max-h-32 rounded-lg object-contain" controls />
                </div>
              ) : (selectedFile.type.startsWith("audio/") || selectedFile.name.match(/\.(mp3|wav|ogg|m4a|aac)$/i)) ? (
                <div className="bg-black/5 p-2 rounded-xl backdrop-blur-sm border border-black/10">
                  <audio src={filePreview} controls className="w-64 h-10" />
                </div>
              ) : (
                <img src={filePreview} alt="Preview" className="max-h-32 rounded-lg object-contain" />
              )
            ) : (
              <div className="flex items-center gap-3 p-2 bg-[var(--color-surface-container)] rounded-lg">
                <FileIcon className="w-8 h-8 text-[var(--color-primary)]" />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-[var(--color-on-surface)] truncate max-w-[200px]">
                    {selectedFile.name}
                  </span>
                  <span className="text-xs text-[var(--color-on-surface-variant)]">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 w-full">
          {isRecording ? (
            <div className="flex-grow flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-full px-4 py-2 select-none">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
              <span className="text-xs font-bold text-red-500">
                Recording {formatDuration(recordingDuration)}
              </span>

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
            <form
              onSubmit={(e) => handleSendMessage(e)}
              className="w-full flex items-center gap-3 select-none"
            >
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
                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,audio/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />

              <div className="flex-grow bg-[var(--color-surface-container-lowest)] rounded-full px-4 py-2 flex items-center gap-2 border border-[var(--color-outline-variant)] focus-within:border-[var(--color-primary)] transition-all">
                <input
                  type="text"
                  value={inputText}
                  maxLength={4000}
                  onChange={handleInputChange}
                  onPaste={(e) => {
                    if (
                      e.clipboardData.files &&
                      e.clipboardData.files.length > 0
                    ) {
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
                          setInputText((prev) => prev + emoji.native);
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

              {!inputText.trim() && !uploading && !selectedFile ? (
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
                  disabled={uploading || (!inputText.trim() && !selectedFile)}
                  className="p-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-container)] text-white rounded-full flex items-center justify-center flex-shrink-0 shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4 fill-current" />
                </button>
              )}
            </form>
          )}
        </div>
      </div>
      {/* Context Menu Overlay */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu(null);
            }}
          />
          <div
            className="fixed z-[101] w-48 bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] shadow-xl rounded-xl py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            style={{
              top: `${Math.min(contextMenu.y, typeof window !== "undefined" ? window.innerHeight - 300 : contextMenu.y)}px`,
              left: `${Math.min(contextMenu.x, typeof window !== "undefined" ? window.innerWidth - 200 : contextMenu.x)}px`,
            }}
          >
            <button
              className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-[var(--color-surface-container-highest)] text-sm cursor-pointer"
              onClick={() => {
                const msg = messages.find(
                  (m) => m.id === contextMenu.messageId,
                );
                if (msg) setReplyingToMessage(msg);
                setContextMenu(null);
              }}
            >
              <Reply className="w-4 h-4 text-[var(--color-on-surface-variant)]" />
              <span>Reply</span>
            </button>

            {contextMenu.hasText && (
              <button
                className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-[var(--color-surface-container-highest)] text-sm cursor-pointer"
                onClick={() => {
                  const msg = messages.find(
                    (m) => m.id === contextMenu.messageId,
                  );
                  if (msg?.plaintext)
                    navigator.clipboard.writeText(msg.plaintext);
                  toast.success("Copied to clipboard");
                  setContextMenu(null);
                }}
              >
                <Copy className="w-4 h-4 text-[var(--color-on-surface-variant)]" />
                <span>Copy Text</span>
              </button>
            )}

            <button
              className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-[var(--color-surface-container-highest)] text-sm cursor-pointer"
              onClick={() => {
                toast.error("Forwarding not implemented yet");
                setContextMenu(null);
              }}
            >
              <Forward className="w-4 h-4 text-[var(--color-on-surface-variant)]" />
              <span>Forward</span>
            </button>

            {contextMenu.isSelf && (
              <>
                <div className="h-[1px] bg-[var(--color-outline-variant)] my-1"></div>
                <button
                  className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-red-50 text-red-600 text-sm cursor-pointer"
                  onClick={() => {
                    toast.error("Delete not implemented yet");
                    setContextMenu(null);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete for everyone</span>
                </button>
              </>
            )}
          </div>
        </>
      )}
      </div>

      {/* Info Pane Sidebar */}
      {isInfoPaneOpen && (
        <ChatInfoSidebar
          conversationId={conversationId}
          otherUser={otherUser}
          onClose={() => setIsInfoPaneOpen(false)}
        />
      )}
    </div>
  );
}
