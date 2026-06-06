"use client";

import React, { useState, useEffect } from "react";
import { X, Image as ImageIcon, FileText, Mic, Link2, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import SecureMediaRenderer from "./SecureMediaRenderer";

interface ChatInfoSidebarProps {
  conversationId: string;
  otherUser: any;
  onClose: () => void;
}

export default function ChatInfoSidebar({
  conversationId,
  otherUser,
  onClose,
}: ChatInfoSidebarProps) {
  const [activeTab, setActiveTab] = useState<"Media" | "Docs" | "Voice" | "Links">("Media");
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttachments = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .or("content_type.eq.attachment,media_url.not.is.null")
          .order("sent_at", { ascending: false });

        if (error) throw error;
        if (!data) return;

        const processed = await Promise.all(
          data.map(async (m) => {
            let plaintext = m.content || "";

            const s3Key = m.media_url || null;
            
            // Categorize
            let category: "Media" | "Docs" | "Voice" | "Links" | "Unknown" = "Unknown";
            const ext = s3Key ? s3Key.split('.').pop()?.split('?')[0]?.toLowerCase() : '';
            
            if (ext) {
              if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'quicktime', 'webm'].includes(ext)) {
                category = "Media";
                if (plaintext === "Voice Note 🎤") category = "Voice";
              } else if (['mp3', 'wav', 'm4a'].includes(ext)) {
                category = "Voice";
              } else {
                category = "Docs";
              }
            }

            // Links detection in text
            if (plaintext && plaintext.match(/https?:\/\/[^\s]+/)) {
              if (category === "Unknown") category = "Links";
            }

            return {
              id: m.id,
              s3Key,
              plaintext,
              category,
              sentAt: new Date(m.sent_at),
            };
          })
        );

        setAttachments(processed.filter(a => a.category !== "Unknown"));
      } catch (err) {
        console.error("Error fetching attachments for info pane", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAttachments();
  }, [conversationId]);

  const tabs = [
    { id: "Media", icon: ImageIcon, label: "Media" },
    { id: "Docs", icon: FileText, label: "Docs" },
    { id: "Voice", icon: Mic, label: "Voice" },
    { id: "Links", icon: Link2, label: "Links" },
  ];

  const currentItems = attachments.filter(a => a.category === activeTab);

  return (
    <div className="w-80 h-full bg-[var(--color-surface)] border-l border-[var(--color-outline-variant)] flex flex-col z-20 shrink-0 shadow-xl overflow-hidden transition-all hidden md:flex">
      {/* Header */}
      <div className="h-16 px-4 border-b border-[var(--color-outline-variant)] flex items-center justify-between shrink-0 bg-[var(--color-surface)]">
        <h2 className="font-bold text-lg text-[var(--color-on-surface)]">Contact Info</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="overflow-y-auto flex-1">
        {/* Profile Info */}
        <div className="p-6 flex flex-col items-center border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)]">
          <div className="w-24 h-24 squircle bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-lg overflow-hidden">
            {otherUser?.avatarUrl ? (
              <img src={otherUser.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              otherUser?.displayName?.[0]?.toUpperCase() || otherUser?.username?.[0]?.toUpperCase() || "?"
            )}
          </div>
          <h3 className="font-bold text-xl text-[var(--color-on-surface)] mb-1">
            {otherUser?.displayName || otherUser?.username}
          </h3>
          <p className="text-sm text-[var(--color-on-surface-variant)]">@{otherUser?.username}</p>
        </div>

        {/* Tabs */}
        <div className="flex px-2 mt-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex flex-col items-center py-3 gap-1 relative text-xs font-semibold transition-colors cursor-pointer
                  ${isActive ? "text-[var(--color-primary)]" : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"}`}
              >
                <Icon className="w-5 h-5 mb-1" />
                {tab.label}
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-[var(--color-primary)] rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-2 mt-2 bg-[var(--color-surface)]">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
            </div>
          ) : currentItems.length === 0 ? (
            <div className="text-center py-10 text-sm text-[var(--color-on-surface-variant)]">
              No {activeTab.toLowerCase()} shared yet.
            </div>
          ) : (
            <div className={activeTab === "Media" ? "grid grid-cols-3 gap-1" : "flex flex-col gap-2"}>
              {currentItems.map((item) => (
                <div key={item.id} className={activeTab === "Media" ? "aspect-square w-full rounded-md overflow-hidden bg-black/5" : "bg-[var(--color-surface-container-low)] p-3 rounded-xl"}>
                  {activeTab === "Media" ? (
                    <div className="w-full h-full scale-[1.02] hover:scale-100 transition-transform">
                      <SecureMediaRenderer
                        mediaUrl={item.s3Key}
                        attachmentKey={null}
                        attachmentIv={null}
                        plaintext={item.plaintext}
                      />
                    </div>
                  ) : activeTab === "Voice" ? (
                     <SecureMediaRenderer
                        mediaUrl={item.s3Key}
                        attachmentKey={null}
                        attachmentIv={null}
                        plaintext="Voice Note 🎤"
                      />
                  ) : activeTab === "Docs" ? (
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[var(--color-primary-container)] flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-[var(--color-on-primary-container)]" />
                        </div>
                        <div className="flex flex-col min-w-0">
                           <span className="text-sm font-semibold truncate text-[var(--color-on-surface)]">{item.s3Key.split('/').pop()}</span>
                           <span className="text-xs text-[var(--color-on-surface-variant)]">{item.sentAt.toLocaleDateString()}</span>
                        </div>
                     </div>
                  ) : (
                    // Links
                    <div className="text-sm text-[var(--color-primary)] break-words hover:underline">
                      <a href={item.plaintext.match(/https?:\/\/[^\s]+/)?.[0]} target="_blank" rel="noopener noreferrer">
                        {item.plaintext.match(/https?:\/\/[^\s]+/)?.[0]}
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
