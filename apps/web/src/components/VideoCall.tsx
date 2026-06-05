"use client";
import { IncomingCallToast } from './IncomingCallToast';
import toast from 'react-hot-toast';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Phone, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Loader2, 
  Maximize2, 
  Minimize2, 
  LayoutGrid, 
  SquareSplitHorizontal 
} from 'lucide-react';

interface VideoCallProps {
  conversationId: string;
  currentUserId: string;
  currentUserProfile: any;
  otherUser: any;
  initialCallType?: 'video' | 'audio';
  incomingOfferPayload?: any; // If triggered by incoming call
  onClose: () => void;
}

export function VideoCall({
  conversationId,
  currentUserId,
  currentUserProfile,
  otherUser,
  initialCallType = 'video',
  incomingOfferPayload = null,
  onClose,
}: VideoCallProps) {
  const [callState, setCallState] = useState<'ringing-out' | 'ringing-in' | 'connecting' | 'connected' | 'ended'>('ringing-out');
  const [callType, setCallType] = useState<'video' | 'audio'>(initialCallType);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(initialCallType === 'audio');

  // Sync statuses from remote peer
  const [isRemoteMuted, setIsRemoteMuted] = useState(false);
  const [isRemoteVideoOff, setIsRemoteVideoOff] = useState(initialCallType === 'audio');

  // Layout states
  const [layoutMode, setLayoutMode] = useState<'floating' | 'split' | 'minimized'>('floating');
  const [localVideoCorner, setLocalVideoCorner] = useState<'bottom-right' | 'bottom-left' | 'top-left' | 'top-right'>('bottom-right');
  const [swappedStreams, setSwappedStreams] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lastTapRef = useRef<number>(0);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const callStateRef = useRef(callState);
  useEffect(() => { callStateRef.current = callState; }, [callState]);

  const durationRef = useRef(duration);
  useEffect(() => { durationRef.current = duration; }, [duration]);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const signalChannelRef = useRef<any>(null);
  const candidateQueueRef = useRef<any[]>([]);
  const localCandidatesQueueRef = useRef<any[]>([]);
  const canSendCandidatesRef = useRef<boolean>(false);
  const isChannelSubscribedRef = useRef<boolean>(false);

  // Synth Audio Ref
  const ringtoneRef = useRef<{
    ctx: AudioContext | null;
    intervalId: any;
  } | null>(null);

  const localVideoRef = useCallback((el: HTMLVideoElement | null) => {
    if (el && localStream && el.srcObject !== localStream) {
      el.srcObject = localStream;
      el.play().catch(err => {
        if (err.name !== 'AbortError') console.warn("Failed to play local video:", err);
      });
    }
  }, [localStream]);

  const remoteVideoRef = useCallback((el: HTMLVideoElement | null) => {
    if (el && remoteStream && el.srcObject !== remoteStream) {
      el.srcObject = remoteStream;
      el.play().catch(err => {
        if (err.name !== 'AbortError') console.warn("Failed to play remote video:", err);
      });
    }
  }, [remoteStream]);

  const remoteAudioRef = useCallback((el: HTMLAudioElement | null) => {
    if (el && remoteStream && el.srcObject !== remoteStream) {
      el.srcObject = remoteStream;
      el.play().catch(err => {
        if (err.name !== 'AbortError') console.warn("Failed to play remote audio:", err);
      });
    }
  }, [remoteStream]);

  // Synthesize Ringtone loop (Web Audio API)
  const startRingback = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      let ctx = ringtoneRef.current?.ctx;
      if (!ctx) {
        ctx = new AudioContextClass();
      }
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      if (ringtoneRef.current?.intervalId) {
        clearInterval(ringtoneRef.current.intervalId);
      }

      const playBeep = () => {
        if (!ctx) return;
        const now = ctx.currentTime;

        // Double ringback beeps
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(425, now);
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.04, now + 0.05);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.3);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(425, now + 0.35);
        gain2.gain.setValueAtTime(0, now + 0.35);
        gain2.gain.linearRampToValueAtTime(0.04, now + 0.4);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.35);
        osc2.stop(now + 0.65);
      };

      playBeep();
      const intervalId = setInterval(playBeep, 2000);
      ringtoneRef.current = { ctx, intervalId };
    } catch (e) {
      console.warn("Failed to start synthetic ringback:", e);
    }
  };

  const startRingtone = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      let ctx = ringtoneRef.current?.ctx;
      if (!ctx) {
        ctx = new AudioContextClass();
      }
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      if (ringtoneRef.current?.intervalId) {
        clearInterval(ringtoneRef.current.intervalId);
      }

      const playChime = () => {
        if (!ctx) return;
        const now = ctx.currentTime;
        // Rhythmic major key progression (A4, C#5, E5, A5)
        const notes = [440.00, 554.37, 659.25, 880.00];
        const times = [0, 0.15, 0.3, 0.45];

        notes.forEach((freq, index) => {
          if (!ctx) return;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + times[index]);

          gain.gain.setValueAtTime(0, now + times[index]);
          gain.gain.linearRampToValueAtTime(0.06, now + times[index] + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + times[index] + 0.45);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + times[index]);
          osc.stop(now + times[index] + 0.45);
        });
      };

      playChime();
      const intervalId = setInterval(playChime, 1800);
      ringtoneRef.current = { ctx, intervalId };
    } catch (e) {
      console.warn("Failed to start synthetic ringtone:", e);
    }
  };

  const stopRingtone = () => {
    if (ringtoneRef.current?.intervalId) {
      clearInterval(ringtoneRef.current.intervalId);
      ringtoneRef.current.intervalId = null;
    }
  };

  const flushCandidateQueue = async () => {
    const pc = peerConnectionRef.current;
    if (pc && pc.remoteDescription) {
      console.log(`Flushing ${candidateQueueRef.current.length} queued ICE candidates`);
      while (candidateQueueRef.current.length > 0) {
        const candidate = candidateQueueRef.current.shift();
        if (candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error('Error adding queued ICE candidate', e);
          }
        }
      }
    }
  };

  const stopMediaAndConnection = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    stopRingtone();
  };

  const saveCallLog = async (reason: string) => {
    try {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: reason,
        content_type: 'call_log',
        ciphertext: reason,
        ciphertext_type: 0
      });
    } catch (e) {
      console.error('Failed to log call', e);
    }
  };

  const endCallAndClose = (reason?: string) => {
    if (reason && !incomingOfferPayload) {
      saveCallLog(reason);
    }
    setCallState('ended');
    stopMediaAndConnection();
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const handleIceRestart = async (pc: RTCPeerConnection) => {
    try {
      if (!incomingOfferPayload) {
        console.log('Initiating WebRTC ICE restart');
        const offer = await pc.createOffer({ iceRestart: true });
        await pc.setLocalDescription(offer);
        
        if (signalChannelRef.current) {
          signalChannelRef.current.send({
            type: 'broadcast',
            event: 'signal',
            payload: {
              type: 'offer',
              senderId: currentUserId,
              conversationId: conversationId,
              callType: callType,
              callerProfile: currentUserProfile,
              offer: offer,
            },
          });
        }
      }
    } catch (err) {
      console.error('Failed to perform ICE restart:', err);
    }
  };

  const setupPeerConnectionListeners = (pc: RTCPeerConnection) => {
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        if (isChannelSubscribedRef.current && canSendCandidatesRef.current && signalChannelRef.current) {
          signalChannelRef.current.send({
            type: 'broadcast',
            event: 'signal',
            payload: {
              type: 'candidate',
              senderId: currentUserId,
              candidate: event.candidate,
            },
          });
        } else {
          console.log('Queuing local candidate (channel or peer not ready)');
          localCandidatesQueueRef.current.push(event.candidate);
        }
      }
    };

    pc.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      setRemoteStream((prevStream) => {
        const stream = new MediaStream(prevStream ? prevStream.getTracks() : []);
        if (!stream.getTracks().find((t) => t.id === event.track.id)) {
          stream.addTrack(event.track);
        }
        return stream;
      });
    };

    pc.onconnectionstatechange = () => {
      console.log('WebRTC Connection State changed:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setCallState('connected');
      } else if (pc.connectionState === 'connecting') {
        setCallState('connecting');
      } else if (pc.connectionState === 'failed') {
        console.warn('WebRTC connection failed. Attempting ICE restart...');
        handleIceRestart(pc);
      } else if (pc.connectionState === 'disconnected') {
        console.log('WebRTC connection disconnected. Showing connecting...');
        setCallState('connecting');
      } else if (pc.connectionState === 'closed') {
        endCallAndClose();
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('WebRTC ICE Connection State changed:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        console.warn('WebRTC ICE connection failed. Attempting ICE restart...');
        handleIceRestart(pc);
      }
    };
  };

  const flushLocalCandidates = () => {
    if (isChannelSubscribedRef.current && canSendCandidatesRef.current && signalChannelRef.current) {
      console.log(`Flushing ${localCandidatesQueueRef.current.length} queued local candidates to remote peer`);
      while (localCandidatesQueueRef.current.length > 0) {
        const cand = localCandidatesQueueRef.current.shift();
        if (cand) {
          try {
            signalChannelRef.current.send({
              type: 'broadcast',
              event: 'signal',
              payload: {
                type: 'candidate',
                senderId: currentUserId,
                candidate: cand,
              },
            });
          } catch (e) {
            console.error('Error sending flushed local candidate:', e);
          }
        }
      }
    }
  };

  const getIceServers = async () => {
    try {
      // Use OpenRelay (metered.ca) for free global TURN servers 
      // This solves the issue where users on strict NATs/cellular get stuck on "connecting"
      // Trigger Vercel deployment
        return {
          iceServers: [
            // Standard STUN servers
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject',
          },
          {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject',
          },
          {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject',
          }
        ]
      };
    } catch (e) {
      console.warn("Failed to set TURN credentials, falling back to STUN only", e);
    }
    return {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    };
  };

  // 1. Establish Signaling and Manage Call Flow
  useEffect(() => {
    const channel = supabase.channel(`call-signaling-${conversationId}`);
    signalChannelRef.current = channel;

    channel
      .on('broadcast', { event: 'signal' }, async ({ payload }) => {
        if (payload.senderId === currentUserId) return;

        switch (payload.type) {
          case 'offer':
            if (incomingOfferPayload && callState === 'ringing-in') {
              // Handled on accept
            } else if (peerConnectionRef.current) {
              console.log('Received renegotiation/ICE restart offer');
              try {
                await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.offer));
                const answer = await peerConnectionRef.current.createAnswer();
                await peerConnectionRef.current.setLocalDescription(answer);
                
                if (signalChannelRef.current) {
                  signalChannelRef.current.send({
                    type: 'broadcast',
                    event: 'signal',
                    payload: {
                      type: 'answer',
                      senderId: currentUserId,
                      answer: answer,
                    },
                  });
                }
              } catch (err) {
                console.error('Error handling renegotiation/ICE restart offer:', err);
              }
            }
            break;

          case 'answer':
            if (peerConnectionRef.current && (callState === 'ringing-out' || callState === 'connecting')) {
              console.log('Received SDP answer');
              setCallState('connected');
              await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
              await flushCandidateQueue();

              canSendCandidatesRef.current = true;
              flushLocalCandidates();
            }
            break;

          case 'candidate':
            if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
              try {
                await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
              } catch (e) {
                console.error('Error adding ICE candidate', e);
              }
            } else {
              candidateQueueRef.current.push(payload.candidate);
            }
            break;

          case 'decline':
            console.log('Call declined');
            endCallAndClose('Call declined');
            break;

          case 'hangup':
            console.log('Call hung up by remote peer');
            endCallAndClose(callStateRef.current === 'connected' ? `Call ended - ${formatDuration(durationRef.current)}` : 'Missed call');
            break;

          case 'camera-toggle':
            console.log('Remote user camera toggled:', payload.isVideoOff);
            setIsRemoteVideoOff(payload.isVideoOff);
            break;

          case 'mute-toggle':
            console.log('Remote user mute toggled:', payload.isMuted);
            setIsRemoteMuted(payload.isMuted);
            break;
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Signaling channel subscribed successfully');
          isChannelSubscribedRef.current = true;
          flushLocalCandidates();
          if (!incomingOfferPayload) {
            startOutgoingCall();
          }
        }
      });

    if (incomingOfferPayload) {
      setCallState('ringing-in');
      setCallType(incomingOfferPayload.callType);
      setIsVideoOff(incomingOfferPayload.callType === 'audio');
      setIsRemoteVideoOff(incomingOfferPayload.callType === 'audio');
    } else {
      setCallState('ringing-out');
    }

    return () => {
      stopMediaAndConnection();
      if (channel) supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // 2. Play ringtones based on calling states
  useEffect(() => {
    if (callState === 'ringing-out') {
      startRingback();
    } else if (callState === 'ringing-in') {
      startRingtone();
    } else {
      stopRingtone();
    }
    return () => {
      stopRingtone();
    };
  }, [callState]);

  // 3. User interaction gesture hook to play ringtone if blocked by browser autoplay
  useEffect(() => {
    const handleGesture = () => {
      if (callState === 'ringing-in' && ringtoneRef.current?.ctx?.state === 'suspended') {
        ringtoneRef.current.ctx.resume().then(() => {
          startRingtone();
        }).catch(() => {});
      }
    };
    window.addEventListener('click', handleGesture);
    return () => window.removeEventListener('click', handleGesture);
  }, [callState]);

  // 4. Timer duration increment effect
  useEffect(() => {
    let intervalId: any = null;
    if (callState === 'connected') {
      setDuration(0);
      intervalId = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [callState]);

  // 5. Track HTML5 Fullscreen API state changes
  useEffect(() => {
    const handleFullscreen = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreen);
    return () => document.removeEventListener('fullscreenchange', handleFullscreen);
  }, []);

  // Broadcast state changes when local controls are toggled
  useEffect(() => {
    if (callState === 'connected' && signalChannelRef.current) {
      signalChannelRef.current.send({
        type: 'broadcast',
        event: 'signal',
        payload: {
          type: 'camera-toggle',
          senderId: currentUserId,
          isVideoOff: isVideoOff,
        },
      });
    }
  }, [isVideoOff, callState]);

  useEffect(() => {
    if (callState === 'connected' && signalChannelRef.current) {
      signalChannelRef.current.send({
        type: 'broadcast',
        event: 'signal',
        payload: {
          type: 'mute-toggle',
          senderId: currentUserId,
          isMuted: isMuted,
        },
      });
    }
  }, [isMuted, callState]);

  const startOutgoingCall = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error("WebRTC Calling requires a secure context (HTTPS) or a supported browser. Please make sure you are accessing the app via HTTPS (e.g., https://localhost:3000 or https://192.168.100.234:3000) and that camera/microphone permissions are allowed.");
      endCallAndClose();
      return;
    }

    try {
      console.log('Starting outgoing call');
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: initialCallType === 'video',
          audio: true,
        });
      } catch (videoErr) {
        if (initialCallType === 'video') {
          console.warn('Failed to access camera, attempting audio-only fallback', videoErr);
          stream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true,
          });
          setCallType('audio');
          setIsVideoOff(true);
          setIsRemoteVideoOff(true);
        } else {
          throw videoErr;
        }
      }

      setLocalStream(stream);
      localStreamRef.current = stream;

      const rtcConfig = await getIceServers();
      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      setupPeerConnectionListeners(pc);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      console.log(`Broadcasting offer to user-global-${otherUser.id}`);
      const invitationChannel = supabase.channel(`user-global-${otherUser.id}`);
      invitationChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await invitationChannel.send({
            type: 'broadcast',
            event: 'signal',
            payload: {
              type: 'offer',
              senderId: currentUserId,
              conversationId: conversationId,
              callType: initialCallType,
              callerProfile: currentUserProfile,
              offer: offer,
            },
          });
          console.log('Offer broadcasted successfully');
          setTimeout(() => {
            supabase.removeChannel(invitationChannel);
          }, 2000);
        }
      });
    } catch (err) {
      console.error('Error starting outgoing call:', err);
      toast.error('Could not access camera or microphone');
      endCallAndClose();
    }
  };

  const acceptIncomingCall = async () => {
    if (!incomingOfferPayload) return;
    canSendCandidatesRef.current = true;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error("WebRTC Calling requires a secure context (HTTPS) or a supported browser. Please access the site via HTTPS.");
      declineCall();
      return;
    }

    setCallState('connecting');

    try {
      console.log('Accepting incoming call');
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: incomingOfferPayload.callType === 'video',
          audio: true,
        });
      } catch (videoErr) {
        if (incomingOfferPayload.callType === 'video') {
          console.warn('Failed to access camera on accept, attempting audio-only fallback', videoErr);
          stream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true,
          });
          setCallType('audio');
          setIsVideoOff(true);
          setIsRemoteVideoOff(true);
        } else {
          throw videoErr;
        }
      }

      setLocalStream(stream);
      localStreamRef.current = stream;

      const rtcConfig = await getIceServers();
      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      setupPeerConnectionListeners(pc);

      await pc.setRemoteDescription(new RTCSessionDescription(incomingOfferPayload.offer));
      await flushCandidateQueue();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (signalChannelRef.current) {
        signalChannelRef.current.send({
          type: 'broadcast',
          event: 'signal',
          payload: {
            type: 'answer',
            senderId: currentUserId,
            answer: answer,
          },
        });
      }

      setCallState('connected');
      flushLocalCandidates();
    } catch (err) {
      console.error('Error accepting call:', err);
      toast.error('Could not access camera or microphone');
      declineCall();
    }
  };

  const declineCall = () => {
    if (signalChannelRef.current) {
      signalChannelRef.current.send({
        type: 'broadcast',
        event: 'signal',
        payload: {
          type: 'decline',
          senderId: currentUserId,
        },
      });
    }
    endCallAndClose('Call declined');
  };

  const hangUpCall = () => {
    if (signalChannelRef.current) {
      signalChannelRef.current.send({
        type: 'broadcast',
        event: 'signal',
        payload: {
          type: 'hangup',
          senderId: currentUserId,
        },
      });
    }
    endCallAndClose(callStateRef.current === 'connected' ? `Call ended - ${formatDuration(durationRef.current)}` : 'Missed call');
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream && callType === 'video') {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.warn(`Fullscreen request failed: ${err.message}`);
        });
      } else {
        document.exitFullscreen().catch(() => {});
      }
    } catch (e) {
      console.warn("Fullscreen toggle is not supported in this browser:", e);
    }
  };

  const cycleCorner = () => {
    const corners: ('bottom-right' | 'bottom-left' | 'top-left' | 'top-right')[] = [
      'bottom-right',
      'bottom-left',
      'top-left',
      'top-right',
    ];
    setLocalVideoCorner((prev) => {
      const idx = corners.indexOf(prev);
      return corners[(idx + 1) % corners.length];
    });
  };

  const handleMiniContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_PRESS_DELAY) {
      setSwappedStreams(prev => !prev);
    } else {
      cycleCorner();
    }
    lastTapRef.current = now;
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const parts = [];
    if (h > 0) parts.push(h.toString().padStart(2, '0'));
    parts.push(m.toString().padStart(2, '0'));
    parts.push(s.toString().padStart(2, '0'));
    return parts.join(':');
  };

  // Helper Corner classes mapping
  const cornerClasses = {
    'bottom-right': 'right-6 bottom-28',
    'bottom-left': 'left-6 bottom-28',
    'top-left': 'left-6 top-24',
    'top-right': 'right-6 top-24',
  };

  // Minimized state card render
  
  // If we have an incoming call, just show the toast
  if (callState === 'ringing-in') {
    return (
      <IncomingCallToast 
        callerName={otherUser?.display_name || otherUser?.username || 'Unknown'}
        callerAvatar={otherUser?.avatar_url}
        isVideoCall={incomingOfferPayload?.callType === 'video'}
        onAccept={acceptIncomingCall}
        onDecline={declineCall}
      />
    );
  }

  if (layoutMode === 'minimized') {
    return (
      <div className="fixed bottom-6 right-6 w-80 h-52 z-50 bg-[#0C0A09]/95 border border-[var(--color-outline-variant)] shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-[24px] flex flex-col overflow-hidden transition-all duration-300">
        {/* Minimized Remote Video Background */}
        {callState === 'connected' && remoteStream && callType === 'video' ? (
          <>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover z-0"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0C0A09]/80 via-transparent to-[#0C0A09]/40 z-10 pointer-events-none" />
            
            {isRemoteVideoOff && (
              <div className="absolute inset-0 bg-[var(--color-surface)] flex flex-col items-center justify-center z-10">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-orange-500 to-red-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                  {otherUser?.avatar_url ? (
                    <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    otherUser?.username?.[0]?.toUpperCase() || '?'
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Avatar placeholder background for audio or dialing/connecting */
          <div className="absolute inset-0 bg-[var(--color-surface)] flex items-center p-4 gap-3 z-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-orange-500 to-red-600 flex items-center justify-center text-white text-base font-bold shadow-md">
              {otherUser?.avatar_url ? (
                <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                otherUser?.username?.[0]?.toUpperCase() || '?'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-white truncate">{otherUser?.display_name || otherUser?.username}</h4>
              <p className="text-[10px] text-[#9A8A7B] font-medium">
                {callState === 'ringing-out' && 'Ringing...'}
                {false /* callState === 'ringing-in' */ && 'Incoming...'}
                {callState === 'connecting' && 'Connecting...'}
                {callState === 'connected' && `Audio Call`}
              </p>
            </div>
          </div>
        )}

        {/* Minimized Controls overlay */}
        <div className="relative z-20 flex flex-col justify-between h-full w-full p-3 bg-gradient-to-b from-slate-950/40 via-transparent to-slate-950/60">
          {/* Header */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5 bg-[var(--color-surface)]/60 backdrop-blur-md px-2 py-1 rounded-lg border border-[var(--color-outline-variant)]">
              {callState === 'connected' && (
                <div className="w-1.5 h-1.5 rounded-full bg-[#FBBF24] animate-pulse" />
              )}
              <span className="text-[10px] font-bold text-white tracking-wide">
                {callState === 'connected' ? formatDuration(duration) : 'Calling...'}
              </span>
            </div>
            <button
              onClick={() => setLayoutMode('floating')}
              className="p-1 rounded-lg bg-[var(--color-surface)]/60 hover:bg-[var(--color-surface-container)]/80 backdrop-blur-md border border-[var(--color-outline-variant)] text-white hover:scale-105 active:scale-95 transition-all"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Controls Footer */}
          <div className="flex items-center justify-center gap-3 w-full mt-auto">
            {false /* callState === 'ringing-in' */ ? (
              <>
                <button
                  onClick={declineCall}
                  className="w-8 h-8 rounded-full bg-red-500 hover:bg-[#B91C1C] flex items-center justify-center text-white shadow-md hover:scale-110 active:scale-95 transition-all"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={acceptIncomingCall}
                  className="w-8 h-8 rounded-full bg-[#FBBF24] hover:bg-[#F59E0B] flex items-center justify-center text-[#0C0A09] shadow-md hover:scale-110 active:scale-95 transition-all animate-bounce"
                >
                  <Phone className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={toggleMute}
                  className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all
                    ${isMuted ? 'bg-red-500 text-white' : 'bg-[var(--color-surface)]/60 backdrop-blur-md text-white border border-[var(--color-outline-variant)]'}`}
                >
                  {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={hangUpCall}
                  className="w-8 h-8 rounded-full bg-red-500 hover:bg-[#B91C1C] flex items-center justify-center text-white shadow-md hover:scale-110 active:scale-95 transition-all"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Hidden Audio element for WebRTC audio delivery */}
        {remoteStream && (
          <audio
            ref={remoteAudioRef}
            autoPlay
            style={{ display: 'none' }}
          />
        )}
      </div>
    );
  }

  // Full Screen / Grid View Render Mode
  return (
    <div className="fixed inset-0 z-50 bg-[#0C0A09] text-white select-none overflow-hidden flex flex-col items-center justify-between transition-all duration-300">
      
      {/* Dynamic Main Calling Layout */}
      {callState === 'connected' ? (
        layoutMode === 'split' ? (
          /* GRID VIEW / SPLIT SCREEN (50-50 Split layout) */
          <div className="relative w-full h-full flex flex-col md:flex-row gap-4 p-6 pt-24 pb-32 z-0">
            {/* Panel 1: Remote user */}
            <div className="relative flex-1 rounded-3xl overflow-hidden border border-[var(--color-outline-variant)] bg-[var(--color-surface)] shadow-2xl flex items-center justify-center">
              {remoteStream && !isRemoteVideoOff && callType === 'video' ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover bg-black"
                />
              ) : (
                <div className="absolute inset-0 bg-[var(--color-surface)] flex flex-col items-center justify-center p-6">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-orange-500 to-red-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg border-2 border-[var(--color-outline-variant)] mb-3 ">
                    {otherUser?.avatar_url ? (
                      <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      otherUser?.username?.[0]?.toUpperCase() || '?'
                    )}
                  </div>
                  <span className="text-sm font-bold text-white">{otherUser?.display_name || otherUser?.username}</span>
                  <span className="text-xs text-[#9A8A7B] mt-1">Camera off</span>
                </div>
              )}
              
              {/* Overlay status label */}
              <div className="absolute bottom-4 left-4 bg-[#0C0A09]/70 backdrop-blur-md px-3 py-1 rounded-xl border border-[var(--color-outline-variant)] flex items-center gap-2">
                <span className="text-xs font-bold text-white">{otherUser?.display_name || otherUser?.username}</span>
                {isRemoteMuted && <MicOff className="w-3.5 h-3.5 text-[#EF4444]" />}
              </div>
            </div>

            {/* Panel 2: Local user */}
            <div className="relative flex-1 rounded-3xl overflow-hidden border border-[var(--color-outline-variant)] bg-[var(--color-surface)] shadow-2xl flex items-center justify-center">
              {localStream && !isVideoOff && callType === 'video' ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover bg-black"
                />
              ) : (
                <div className="absolute inset-0 bg-[var(--color-surface)] flex flex-col items-center justify-center p-6">
                  <div className="w-24 h-24 rounded-full bg-[var(--color-surface-container)] flex items-center justify-center text-white text-3xl font-bold border border-[var(--color-outline-variant)] mb-3">
                    {currentUserProfile?.avatar_url ? (
                      <img src={currentUserProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      currentUserProfile?.username?.[0]?.toUpperCase() || '?'
                    )}
                  </div>
                  <span className="text-sm font-bold text-white">You</span>
                  <span className="text-xs text-slate-400 mt-1">Camera off</span>
                </div>
              )}

              {/* Overlay status label */}
              <div className="absolute bottom-4 left-4 bg-slate-950/70 backdrop-blur-md px-3 py-1 rounded-xl border border-white/5 flex items-center gap-2">
                <span className="text-xs font-bold text-white">You</span>
                {isMuted && <MicOff className="w-3.5 h-3.5 text-[#EF4444]" />}
              </div>
            </div>
          </div>
        ) : (
          /* FLOATING SPEAKER VIEW (FaceTime / Fullscreen view) */
          <>
            {/* Background Stream */}
            {(() => {
              const isPrimaryLocal = swappedStreams;
              const streamToUse = isPrimaryLocal ? localStream : remoteStream;
              const refToUse = isPrimaryLocal ? localVideoRef : remoteVideoRef;
              const videoOff = isPrimaryLocal ? isVideoOff : isRemoteVideoOff;
              const userProfile = isPrimaryLocal ? currentUserProfile : otherUser;
              
              if (streamToUse && !videoOff && callType === 'video') {
                return (
                  <>
                    <video
                      ref={refToUse}
                      autoPlay
                      playsInline
                      muted={true}
                      className="absolute inset-0 w-full h-full object-cover bg-black z-0"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0C0A09]/60 via-transparent to-[#0C0A09]/40 z-10 pointer-events-none" />
                  </>
                );
              }
              
              return (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-[#0C0A09] z-0">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.1),transparent_75%)] pointer-events-none" />
                  <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-orange-500 to-red-600 flex items-center justify-center text-white text-4xl font-bold overflow-hidden shadow-2xl mb-4 border-4 border-[#0C0A09] ">
                    {userProfile?.avatar_url ? (
                      <img src={userProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      userProfile?.username?.[0]?.toUpperCase() || '?'
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-white mb-1">
                    {isPrimaryLocal ? 'You' : (userProfile?.display_name || userProfile?.username)}
                  </h2>
                  <span className="text-xs text-[#F97316] bg-[#F97316]/10 px-3 py-1 rounded-full border border-[#F97316]/20">
                    Camera Off
                  </span>
                </div>
              );
            })()}

            {/* Mini Floating Container overlay */}
            {(() => {
              const isSecondaryLocal = !swappedStreams;
              const streamToUse = isSecondaryLocal ? localStream : remoteStream;
              const refToUse = isSecondaryLocal ? localVideoRef : remoteVideoRef;
              const videoOff = isSecondaryLocal ? isVideoOff : isRemoteVideoOff;
              const userProfile = isSecondaryLocal ? currentUserProfile : otherUser;
              
              const cornerClass = cornerClasses[localVideoCorner];

              if (!streamToUse) return null;

              return (
                <div
                  onClick={handleMiniContainerClick}
                  className={`absolute w-32 h-44 sm:w-40 sm:h-56 rounded-2xl overflow-hidden border border-[var(--color-outline-variant)] bg-[#0C0A09] shadow-2xl z-20 transition-all duration-300 ease-in-out cursor-pointer hover:scale-105 active:scale-95 group ${cornerClass}`}
                  title="Double-click to swap feeds, click to snap corners"
                >
                  {!videoOff && callType === 'video' ? (
                    <video
                      ref={refToUse}
                      autoPlay
                      playsInline
                      muted={true}
                      className="w-full h-full object-cover bg-black pointer-events-none"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[var(--color-surface)] flex flex-col items-center justify-center p-3 pointer-events-none">
                      <div className="w-12 h-12 rounded-full bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] flex items-center justify-center text-white text-base font-bold mb-2">
                        {userProfile?.avatar_url ? (
                          <img src={userProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          userProfile?.username?.[0]?.toUpperCase() || '?'
                        )}
                      </div>
                      <span className="text-[10px] text-[#9A8A7B] font-bold">
                        {isSecondaryLocal ? 'You' : (userProfile?.display_name || userProfile?.username)}
                      </span>
                    </div>
                  )}

                  {/* Mini Mute Indicator */}
                  {((isSecondaryLocal && isMuted) || (!isSecondaryLocal && isRemoteMuted)) && (
                    <div className="absolute top-2 right-2 p-1 rounded-lg bg-red-500 text-white z-20 shadow-md">
                      <MicOff className="w-3 h-3" />
                    </div>
                  )}

                  {/* Swap View Button overlay on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSwappedStreams(!swappedStreams);
                    }}
                    className="absolute bottom-2 left-2 p-1.5 rounded-lg bg-[var(--color-surface)]/80 hover:bg-blue-500 text-white border border-[var(--color-outline-variant)] opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity z-20 duration-200"
                    title="Swap streams view"
                  >
                    <SquareSplitHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })()}
          </>
        )
      ) : (
        /* Ringing backdrop */
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-[#0C0A09] z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.12),transparent_60%)] pointer-events-none" />
          
          <div className="relative flex flex-col items-center justify-center p-12 bg-white/5 backdrop-blur-2xl border border-[var(--color-outline-variant)] rounded-[40px] shadow-2xl max-w-sm w-full text-center">
            {callState !== 'ended' && (
              <>
                <div className="absolute w-44 h-44 rounded-full border border-[#F97316]/20 animate-ping pointer-events-none" />
                <div className="absolute w-36 h-36 rounded-full border border-[#F97316]/30 animate-pulse pointer-events-none" />
              </>
            )}
            
            <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-orange-500 to-red-600 flex items-center justify-center text-white text-4xl font-bold overflow-hidden shadow-2xl mb-6 z-10 border-4 border-[#0C0A09] ">
              {otherUser?.avatar_url ? (
                <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                otherUser?.username?.[0]?.toUpperCase() || '?'
              )}
            </div>
            
            <h2 className="text-2xl font-black tracking-tight text-white mb-2 z-10">
              {otherUser?.display_name || otherUser?.username}
            </h2>
            
            <span className="text-xs uppercase tracking-widest font-bold text-[#F97316] bg-[#F97316]/10 px-4 py-1.5 rounded-full border border-[#F97316]/20 z-10 animate-pulse">
              {callState === 'ringing-out' && 'Ringing...'}
              {false /* callState === 'ringing-in' */ && 'Incoming Call...'}
              {callState === 'connecting' && 'Connecting...'}
              {callState === 'ended' && 'Call Ended'}
            </span>
          </div>
        </div>
      )}

      {/* 2. Top Profile Header & Action Buttons */}
      <div className="absolute top-6 left-6 right-6 z-20 flex items-center justify-between pointer-events-none">
        {/* Floating Profile Box */}
        {callState === 'connected' && (
          <div className="flex items-center gap-3 bg-[var(--color-surface)]/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-[var(--color-outline-variant)] shadow-xl pointer-events-auto ">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-[var(--color-outline-variant)] bg-gradient-to-tr from-orange-500 to-red-600 flex items-center justify-center font-bold text-sm">
              {otherUser?.avatar_url ? (
                <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                otherUser?.username?.[0]?.toUpperCase() || '?'
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">{otherUser?.display_name || otherUser?.username}</h3>
              <p className="text-[10px] text-[#F97316] font-semibold tracking-wide uppercase">
                {formatDuration(duration)}
              </p>
            </div>
          </div>
        )}

        {/* Top-Right Action Toggles (Minimize call, etc) */}
        <div className="flex items-center gap-2 pointer-events-auto ml-auto">
          {callState !== 'ended' && (
            <button
              onClick={() => setLayoutMode('minimized')}
              className="p-2.5 rounded-2xl bg-[var(--color-surface)]/80 hover:bg-[var(--color-surface-container)]/80 backdrop-blur-md border border-[var(--color-outline-variant)] text-white shadow-xl hover:scale-105 active:scale-95 transition-all"
              title="Minimize Call"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Glassmorphic Bottom Controls Panel */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 bg-[var(--color-surface)]/80 backdrop-blur-xl px-6 py-4 rounded-[28px] border border-[var(--color-outline-variant)] shadow-2xl max-w-md w-[calc(100%-2rem)] justify-center transition-all duration-300">
        {false /* callState === 'ringing-in' */ ? (
          <>
            <button
              onClick={declineCall}
              className="w-14 h-14 rounded-full bg-red-500 hover:bg-[#B91C1C] flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <button
              onClick={acceptIncomingCall}
              className="w-14 h-14 rounded-full bg-[#FBBF24] hover:bg-[#F59E0B] flex items-center justify-center text-[#0C0A09] shadow-lg transition-transform hover:scale-110 active:scale-95 animate-bounce"
            >
              <Phone className="w-6 h-6" />
            </button>
          </>
        ) : (
          <>
            {/* Mute Toggle */}
            <button
              onClick={toggleMute}
              disabled={callState === 'ended'}
              className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105 active:scale-95
                ${isMuted ? 'bg-red-500 text-white animate-pulse' : 'bg-white/10 hover:bg-white/20 text-white'}`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* End Call / Hang up */}
            <button
              onClick={hangUpCall}
              className="w-14 h-14 rounded-full bg-red-500 hover:bg-[#B91C1C] flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
              title="Hang up"
            >
              <PhoneOff className="w-6 h-6" />
            </button>

            {/* Video Camera Toggle */}
            {callType === 'video' && (
              <button
                onClick={toggleVideo}
                disabled={callState === 'ended'}
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105 active:scale-95
                  ${isVideoOff ? 'bg-red-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                title={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
              >
                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>
            )}

            {/* Layout Split / Grid Toggle */}
            {callState === 'connected' && callType === 'video' && (
              <button
                onClick={() => setLayoutMode(layoutMode === 'split' ? 'floating' : 'split')}
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105 active:scale-95
                  ${layoutMode === 'split' ? 'bg-[#F97316] text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                title="Toggle Grid / Speaker layout"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
            )}

            {/* HTML5 Fullscreen Toggle */}
            {callState === 'connected' && (
              <button
                onClick={toggleFullscreen}
                className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 bg-white/10 hover:bg-white/20 text-white"
                title="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
            )}
          </>
        )}
      </div>

      {/* Hidden Audio element for WebRTC audio delivery */}
      {remoteStream && (
        <audio
          ref={remoteAudioRef}
          autoPlay
          style={{ display: 'none' }}
        />
      )}
    </div>
  );
}

