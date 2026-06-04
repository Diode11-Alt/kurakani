"use client";

import React, { useState, useEffect } from "react";
import { Loader2, FileIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function SecureMediaRenderer({ 
  mediaUrl, 
  isSelf, 
  plaintext,
  attachmentKey,
  attachmentIv
}: { 
  mediaUrl: string; 
  isSelf?: boolean; 
  plaintext?: string;
  attachmentKey?: string | null;
  attachmentIv?: string | null;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!mediaUrl) return;
    if (mediaUrl.startsWith("http") || mediaUrl.startsWith("blob:")) {
      setUrl(mediaUrl);
      return;
    }
    
    let isMounted = true;
    supabase.storage.from('attachments').createSignedUrl(mediaUrl, 3600).then(async ({ data }) => {
      if (!isMounted || !data?.signedUrl) return;

      if (attachmentKey && attachmentIv) {
        try {
          const res = await fetch(data.signedUrl);
          const arrayBuffer = await res.arrayBuffer();
          const encryptedBytes = new Uint8Array(arrayBuffer);
          
          const { decryptAttachment, base64ToArrayBuffer } = await import("@signal/crypto");
          const keyBuffer = base64ToArrayBuffer(attachmentKey);
          const ivBuffer = base64ToArrayBuffer(attachmentIv);
          
          const decryptedData = decryptAttachment(encryptedBytes, new Uint8Array(keyBuffer), new Uint8Array(ivBuffer));
          
          if (!decryptedData) {
            throw new Error("MAC verification failed - decryptedData is null");
          }
          
          const ext = mediaUrl.split('.').pop()?.split('?')[0]?.toLowerCase();
          let mime = 'application/octet-stream';
          if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
          else if (ext === 'png') mime = 'image/png';
          else if (ext === 'gif') mime = 'image/gif';
          else if (ext === 'webp') mime = 'image/webp';
          else if (ext === 'svg') mime = 'image/svg+xml';
          else if (ext === 'mp4') mime = 'video/mp4';
          else if (ext === 'webm' && plaintext === "Voice Note 🎤") mime = 'audio/webm';
          else if (ext === 'webm') mime = 'video/webm';
          else if (ext === 'mov' || ext === 'quicktime') mime = 'video/quicktime';
          else if (ext === 'mp3') mime = 'audio/mpeg';
          else if (ext === 'wav') mime = 'audio/wav';
          else if (ext === 'weba') mime = 'audio/webm';
          else if (ext === 'm4a') mime = 'audio/mp4';
          
          const blob = new Blob([decryptedData], { type: mime });
          const objectUrl = URL.createObjectURL(blob);
          if (isMounted) setUrl(objectUrl);
        } catch (err) {
          console.error("Attachment decryption failed", err);
        }
      } else {
        if (isMounted) setUrl(data.signedUrl);
      }
    });

    return () => { isMounted = false; };
  }, [mediaUrl, attachmentKey, attachmentIv, plaintext]);

  if (!url) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin opacity-50" />
      </div>
    );
  }

  if (plaintext === "Voice Note 🎤" || (mediaUrl && mediaUrl.match(/\.(mp3|wav|ogg|m4a|weba)(\?|$)/i))) {
    return (
      <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm border border-black/5">
        <audio
          src={url}
          controls
          preload="metadata"
          className="w-full h-10 min-w-[200px] max-w-[240px] focus:outline-none rounded-lg"
        />
      </div>
    );
  }

  if (mediaUrl && mediaUrl.match(/\.(mp4|webm|mov|quicktime)(\?|$)/i) && plaintext !== "Voice Note 🎤") {
    return (
      <div 
        className="relative bg-black rounded-xl overflow-hidden border border-black/10 group cursor-pointer"
        onClick={() => setIsPlaying(true)}
      >
        <video
          src={url}
          controls={isPlaying}
          autoPlay={isPlaying}
          preload="metadata"
          className="w-full max-h-64 object-contain focus:outline-none"
        />
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
            <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg group-hover:scale-110 transition-transform">
              <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-white border-b-[8px] border-b-transparent ml-1" />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (mediaUrl && (mediaUrl.match(/\.(mp3|wav|ogg|m4a|aac)(\?|$)/i) || plaintext === "Voice Note 🎤")) {
    return (
      <div className="bg-black/5 p-2 rounded-xl backdrop-blur-sm border border-black/10">
        <audio
          src={url}
          controls
          preload="metadata"
          className="w-full max-w-[240px] h-10 focus:outline-none"
        />
      </div>
    );
  }

  if (mediaUrl && mediaUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i)) {
    return (
      <img
        src={url}
        alt=""
        className="max-h-48 object-cover w-full rounded-xl border border-black/5"
      />
    );
  }

  if (!mediaUrl) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 p-3 transition-colors rounded-xl border max-w-xs cursor-pointer no-underline ${isSelf ? "bg-white/10 hover:bg-white/20 border-white/20" : "bg-black/5 hover:bg-black/10 border-black/10"}`}
    >
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ${isSelf ? "bg-white text-[var(--color-primary)]" : "bg-[var(--color-primary)] text-white"}`}
      >
        <FileIcon className="w-5 h-5" />
      </div>
      <div className="flex flex-col overflow-hidden min-w-[120px]">
        <span className="text-sm font-bold truncate">
          {mediaUrl.split("/").pop()?.split("?")[0] || "Document"}
        </span>
        <span className="text-xs opacity-75">Click to view</span>
      </div>
    </a>
  );
}
