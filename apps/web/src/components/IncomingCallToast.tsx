import React from 'react';
import { Video, Phone, PhoneOff, ShieldCheck } from 'lucide-react';

interface IncomingCallToastProps {
  callerName: string;
  callerAvatar?: string;
  isVideoCall: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCallToast({
  callerName,
  callerAvatar,
  isVideoCall,
  onAccept,
  onDecline
}: IncomingCallToastProps) {
  return (
    <div className="fixed top-6 right-6 z-[100] w-full max-w-[360px] animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="backdrop-blur-xl bg-[var(--color-surface)]/80 border border-[var(--color-outline-variant)]/30 rounded-xl shadow-xl overflow-hidden">
        <div className="p-4 flex items-center gap-4">
          <div className="relative flex-shrink-0">
            {callerAvatar ? (
              <img 
                src={callerAvatar} 
                alt={callerName} 
                className="w-14 h-14 rounded-xl object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
                {callerName?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            
            <div className="absolute -bottom-1 -right-1 bg-[var(--color-primary)] text-white p-1 rounded-lg border-2 border-[var(--color-surface)] flex items-center justify-center">
              {isVideoCall ? (
                <Video className="w-3.5 h-3.5" />
              ) : (
                <Phone className="w-3.5 h-3.5" />
              )}
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-primary)] font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Secure
              </span>
            </div>
            <p className="text-sm font-bold text-[var(--color-on-surface)] truncate">Incoming {isVideoCall ? 'Video' : 'Audio'} Call</p>
            <p className="text-xs text-[var(--color-on-surface-variant)] truncate">{callerName} is calling you...</p>
          </div>
        </div>
        <div className="flex border-t border-[var(--color-outline-variant)]/20">
          <button 
            onClick={onDecline}
            className="flex-1 py-3 text-red-500 font-bold text-sm hover:bg-red-500/5 transition-colors border-r border-[var(--color-outline-variant)]/20 active:bg-red-500/10"
          >
            Decline
          </button>
          <button 
            onClick={onAccept}
            className="flex-1 py-3 bg-[var(--color-primary)] text-white font-bold text-sm hover:bg-[var(--color-primary)]/90 transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {isVideoCall ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
