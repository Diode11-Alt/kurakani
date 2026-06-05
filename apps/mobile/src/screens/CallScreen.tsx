import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, RTCView, mediaDevices } from 'react-native-webrtc';
import { useSocket } from '../signal/SocketContext';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react-native';

const getIceServers = () => {
  let servers: any[] = [
    { urls: 'stun:stun.l.google.com:19302' }
  ];

  servers.push(
    { urls: 'stun:stun.relay.metered.ca:80' },
    { urls: 'turn:global.relay.metered.ca:80', username: '555b2cd36bf24ad2ad21d583', credential: 'W+kerXypxn7ObzV5' },
    { urls: 'turn:global.relay.metered.ca:80?transport=tcp', username: '555b2cd36bf24ad2ad21d583', credential: 'W+kerXypxn7ObzV5' },
    { urls: 'turn:global.relay.metered.ca:443', username: '555b2cd36bf24ad2ad21d583', credential: 'W+kerXypxn7ObzV5' },
    { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username: '555b2cd36bf24ad2ad21d583', credential: 'W+kerXypxn7ObzV5' }
  );

  return { iceServers: servers };
};

export default function CallScreen() {
  const { socket } = useSocket();
  const navigation = useNavigation();
  const route = useRoute();
  const { id: peerId, name: peerName, isIncoming, offerPayload } = route.params as any;
  
  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  
  const pc = useRef<RTCPeerConnection | null>(null);
  const candidateQueueRef = useRef<any[]>([]);
  const localCandidatesQueueRef = useRef<any[]>([]); // Buffer for caller's outgoing candidates

  useEffect(() => {
    const setupWebrtc = async () => {
      // 1. Get Local Media
      let stream;
      try {
        stream = await mediaDevices.getUserMedia({
          audio: true,
          video: { width: 640, height: 480, frameRate: 30, facingMode: 'user' },
        });
        setLocalStream(stream);
      } catch (err) {
        console.error('Failed to get local stream', err);
        return;
      }

      // 2. Setup PC
      const peer = new RTCPeerConnection(getIceServers());
      pc.current = peer;

      stream.getTracks().forEach(t => peer.addTrack(t, stream));

      peer.addEventListener('track', (event: any) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      });

      peer.addEventListener('icecandidate', (event: any) => {
        if (event.candidate && socket) {
          // FIX: Void Broadcast race condition
          // If we are the caller and callee hasn't answered yet, buffer candidates
          if (isIncoming || peer.remoteDescription) {
            socket.emit('ice-candidate', {
              targetUserId: peerId,
              candidate: event.candidate,
            });
          } else {
            // Caller waiting for callee to accept — buffer locally
            localCandidatesQueueRef.current.push(event.candidate);
          }
        }
      });

      if (!isIncoming) {
        // We are calling
        const offer = await peer.createOffer({});
        await peer.setLocalDescription(offer);
        socket?.emit('webrtc-offer', {
          targetUserId: peerId,
          offer,
          callType: 'video',
          conversationId: peerId
        });
      } else if (offerPayload) {
        // We are receiving
        await peer.setRemoteDescription(new RTCSessionDescription(offerPayload.offer));
        
        // Process queued candidates that arrived before the offer
        for (const c of candidateQueueRef.current) {
          await peer.addIceCandidate(new RTCIceCandidate(c)).catch(console.error);
        }
        candidateQueueRef.current = [];

        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket?.emit('webrtc-answer', {
          targetUserId: peerId,
          answer
        });
      }
    };

    setupWebrtc();

    // Socket Listeners
    if (socket) {
      socket.on('webrtc-answer', async (payload: any) => {
        if (pc.current && pc.current.signalingState !== 'stable') {
          await pc.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
          // Process queued remote candidates
          for (const c of candidateQueueRef.current) {
            await pc.current.addIceCandidate(new RTCIceCandidate(c)).catch(console.error);
          }
          candidateQueueRef.current = [];

          // Flush local buffered candidates now that callee is actively listening
          if (socket) {
            for (const c of localCandidatesQueueRef.current) {
              socket.emit('ice-candidate', {
                targetUserId: peerId,
                candidate: c,
              });
            }
            localCandidatesQueueRef.current = [];
          }
        }
      });

      socket.on('ice-candidate', async (payload: any) => {
        if (pc.current && payload.candidate) {
          if (pc.current.remoteDescription) {
            await pc.current.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(console.error);
          } else {
            candidateQueueRef.current.push(payload.candidate);
          }
        }
      });

      socket.on('call-end', () => {
        handleEndCall(false);
      });
    }

    return () => {
      socket?.off('webrtc-answer');
      socket?.off('ice-candidate');
      socket?.off('call-end');
      if (pc.current) pc.current.close();
      if (localStream) localStream.getTracks().forEach((t: any) => t.stop());
    };
  }, []);

  const handleEndCall = (emit = true) => {
    if (emit && socket) {
      socket.emit('call-end', { targetUserId: peerId });
    }
    if (pc.current) pc.current.close();
    if (localStream) localStream.getTracks().forEach((t: any) => t.stop());
    navigation.goBack();
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t: any) => t.enabled = !t.enabled);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((t: any) => t.enabled = !t.enabled);
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  return (
    <View style={styles.container}>
      {remoteStream ? (
        <RTCView streamURL={remoteStream.toURL()} style={styles.remoteVideo} objectFit="cover" />
      ) : (
        <View style={styles.connectingContainer}>
          <Text style={styles.callingText}>Calling {peerName}...</Text>
        </View>
      )}

      {localStream && isVideoEnabled && (
        <RTCView streamURL={localStream.toURL()} style={styles.localVideo} objectFit="cover" zOrder={1} />
      )}

      <View style={styles.controls}>
        <TouchableOpacity style={[styles.controlBtn, isMuted && styles.controlBtnOff]} onPress={toggleMute}>
          {isMuted ? <MicOff color="#fff" /> : <Mic color="#fff" />}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.controlBtn, !isVideoEnabled && styles.controlBtnOff]} onPress={toggleVideo}>
          {isVideoEnabled ? <Video color="#fff" /> : <VideoOff color="#fff" />}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.controlBtn, styles.endCallBtn]} onPress={() => handleEndCall(true)}>
          <PhoneOff color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  remoteVideo: { flex: 1 },
  localVideo: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 100,
    height: 150,
    backgroundColor: '#333',
    borderRadius: 10,
    overflow: 'hidden'
  },
  connectingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  callingText: { color: '#fff', fontSize: 20 },
  controls: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20
  },
  controlBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  controlBtnOff: { backgroundColor: 'rgba(255,255,255,0.1)' },
  endCallBtn: { backgroundColor: '#ef4444' }
});
