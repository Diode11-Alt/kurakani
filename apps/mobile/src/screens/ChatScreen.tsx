import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Image, Linking, SafeAreaView } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/RootNavigator';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Send, Mic, ArrowLeft, MoreVertical, Plus, Timer } from 'lucide-react-native';
import { getMessages, saveMessage, CryptoStore } from '../signal/SignalStore';
import { useSocket } from '../signal/SocketContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { encryptMessage, decryptMessage } from '@signal/crypto';
import { base64ToBuffer } from '../signal/utils';

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;

export default function ChatScreen() {
  const route = useRoute<ChatScreenRouteProp>();
  const navigation = useNavigation();
  const { id: activeContact, name } = route.params;
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [expiresIn, setExpiresIn] = useState<number>(0); // 0 = off, else seconds
  const { socket } = useSocket();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMessages();
  }, [activeContact]);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = async (data: any) => {
      let payload;
      try {
        payload = JSON.parse(data);
        if (payload.type !== 'message:receive') return;
      } catch { return; }

      try {
        const secretBase64 = await CryptoStore.getSharedSecret(payload.fromUserId);
        if (!secretBase64) throw new Error("No shared secret");
        
        const sharedSecret = new Uint8Array(base64ToBuffer(secretBase64));
        const plaintext = decryptMessage(sharedSecret, payload.ciphertext);
        if (!plaintext) throw new Error("Decryption failed");

        let messageObj: any = { type: 'text', content: plaintext };
        try {
          messageObj = JSON.parse(plaintext);
        } catch (e) { }

        let displayContent = messageObj.content || plaintext;
        let attachment = null;

        if (messageObj.linkPreview) {
          attachment = { type: 'link', data: messageObj.linkPreview };
        } else if (messageObj.type === 'voice') {
          displayContent = '🎤 Voice message received';
          attachment = { type: 'voice' };
        }

        const newMsg = {
          id: payload.id || Date.now().toString(),
          conversationId: payload.fromUserId,
          text: displayContent,
          attachment,
          sent: false,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: Date.now()
        };

        await saveMessage(newMsg);

        if (activeContact === payload.fromUserId) {
          setMessages(prev => [...prev, newMsg]);
        }
      } catch (err) {
        console.error('Decryption failed on mobile:', err);
      }
    };

    socket.on('message', handleMessage);
    return () => {
      socket.off('message', handleMessage);
    };
  }, [socket, activeContact]);

  const loadMessages = async () => {
    const msgs = await getMessages(activeContact);
    setMessages(msgs.sort((a: any, b: any) => a.timestamp - b.timestamp));
  };

  const handleSend = async () => {
    if (!input.trim() || !activeContact || !socket) return;

    const plaintext = input;
    setInput('');

    let linkPreview = null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = plaintext.match(urlRegex);
    if (urls && urls.length > 0) {
      try {
        const token = await AsyncStorage.getItem('signal_token');
        const res = await fetch(`http://localhost:4000/api/utils/link-preview?url=${encodeURIComponent(urls[0])}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          linkPreview = await res.json();
        }
      } catch (err) { }
    }

    const payloadString = JSON.stringify({ type: 'text', content: plaintext, linkPreview });
    const newMsg = {
      id: Date.now().toString(),
      conversationId: activeContact,
      text: plaintext,
      attachment: linkPreview ? { type: 'link', data: linkPreview } : null,
      sent: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, newMsg]);
    await saveMessage(newMsg);

    try {
      const secretBase64 = await CryptoStore.getSharedSecret(activeContact);
      if (!secretBase64) throw new Error("No shared secret");
      const sharedSecret = new Uint8Array(base64ToBuffer(secretBase64));

      const ciphertextMessage = encryptMessage(sharedSecret, payloadString);

      socket.send(JSON.stringify({
        type: 'message:send',
        recipientId: activeContact,
        ciphertext: ciphertextMessage,
        ciphertextType: 3,
        expiresIn: expiresIn > 0 ? expiresIn : undefined
      }));
    } catch (err) {
      console.error('Encryption failed', err);
    }
  };

  const renderItem = useCallback(({ item, index }: { item: any, index: number }) => {
    const isFirstInGroup = index === 0 || messages[index - 1]?.sent !== item.sent;

    return (
      <View style={[styles.messageWrapper, item.sent ? styles.messageSentWrapper : styles.messageReceivedWrapper, isFirstInGroup && { marginTop: 12 }]}>
        <View style={[styles.messageBubble, item.sent ? styles.messageBubbleSent : styles.messageBubbleReceived]}>
          <Text style={[styles.messageText, item.sent ? styles.messageTextSent : styles.messageTextReceived]}>
            {item.text}
          </Text>

          {item.attachment?.type === 'link' && item.attachment.data && (
            <TouchableOpacity onPress={() => Linking.openURL(item.attachment.data.url)} style={styles.linkCard} accessible={true} accessibilityRole="link" accessibilityLabel={`Link to ${item.attachment.data.title}`}>
              {item.attachment.data.image ? <Image source={{ uri: item.attachment.data.image }} style={styles.linkImage} /> : null}
              <View style={styles.linkInfo}>
                <Text style={[styles.linkTitle, item.sent ? styles.messageTextSent : styles.messageTextReceived]} numberOfLines={1}>{item.attachment.data.title}</Text>
                {item.attachment.data.description ? (
                  <Text style={[styles.linkDesc, item.sent ? styles.messageTextSent : styles.messageTextReceived]} numberOfLines={2}>{item.attachment.data.description}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          )}

          {item.attachment?.type === 'voice' && (
            <View style={styles.voiceCard} accessible={true} accessibilityLabel="Voice Message">
              <Mic size={20} color={item.sent ? colors.onPrimaryFixed : colors.onSurface} />
              <Text style={item.sent ? styles.messageTextSent : styles.messageTextReceived}> Voice Message</Text>
            </View>
          )}
        </View>
        <Text style={[styles.timeText, item.sent ? styles.timeTextSent : styles.timeTextReceived]}>
          {item.time}
        </Text>
      </View>
    );
  }, [messages]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Custom Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} accessible={true} accessibilityRole="button" accessibilityLabel="Go back">
              <ArrowLeft color={colors.onSurfaceVariant} size={24} />
            </TouchableOpacity>
            
            <View style={styles.headerProfileInfo}>
              <View style={styles.avatarContainer}>
                <Image 
                  source={{ uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200' }} 
                  style={styles.avatar} 
                />
                <View style={styles.activeDot} />
              </View>
              <View>
                <Text style={styles.headerName} numberOfLines={1}>{name}</Text>
                <Text style={styles.headerStatus}>Active now</Text>
              </View>
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity 
              style={styles.iconBtn} 
              onPress={() => setExpiresIn(prev => prev === 0 ? 900 : 0)} // Toggle 15 mins (900s)
              accessible={true} 
              accessibilityRole="button" 
              accessibilityLabel={expiresIn > 0 ? "Disappearing messages on" : "Disappearing messages off"}
            >
              <Timer color={expiresIn > 0 ? colors.primary : colors.onSurfaceVariant} size={24} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} accessible={true} accessibilityRole="button" accessibilityLabel="More options">
              <MoreVertical color={colors.onSurfaceVariant} size={24} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Chat List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
        />

        {/* Composer */}
        <View style={styles.composerWrapper}>
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.composerBtn} activeOpacity={0.7} accessible={true} accessibilityRole="button" accessibilityLabel="Add attachment">
              <Plus size={24} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
            
            <TextInput
              style={styles.input}
              placeholder="Message"
              placeholderTextColor="rgba(67, 70, 83, 0.5)" // on-surface-variant/50
              value={input}
              onChangeText={setInput}
              multiline
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              accessible={true}
              accessibilityLabel="Message input"
            />
            
            <TouchableOpacity 
              onPress={handleSend} 
              style={[styles.composerBtn, input.trim() ? styles.composerBtnActive : null]} 
              activeOpacity={0.7}
              disabled={!input.trim()}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Send message"
            >
              <Send size={24} color={input.trim() ? colors.primary : colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(9, 9, 11, 0.8)', // Dark background/80
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  headerProfileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerHighest,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  activeDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    backgroundColor: '#4ade80',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.surfaceContainerLowest,
  },
  headerName: {
    fontFamily: typography.fonts.headline,
    fontWeight: 'bold',
    fontSize: 18,
    color: colors.onSurface,
  },
  headerStatus: {
    fontFamily: typography.fonts.labelBold,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  listContent: { padding: 16, paddingBottom: 24 },
  messageWrapper: { maxWidth: '85%', marginBottom: 8 },
  messageSentWrapper: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  messageReceivedWrapper: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  messageBubble: {
    padding: 16,
    borderRadius: 8, // small radius matches design
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageBubbleSent: {
    backgroundColor: colors.primary,
  },
  messageBubbleReceived: {
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  messageText: { 
    fontFamily: typography.fonts.body,
    fontSize: 14, 
    lineHeight: 22,
  },
  messageTextSent: { color: colors.onPrimary },
  messageTextReceived: { color: colors.onSurface },
  timeText: {
    fontFamily: typography.fonts.labelBold,
    fontSize: 10,
    color: 'rgba(67, 70, 83, 0.7)', // on-surface-variant/70
    marginTop: 4,
    opacity: 1, // typically hover shows this, but mobile implies always shown or on tap
  },
  timeTextSent: { paddingRight: 4 },
  timeTextReceived: { paddingLeft: 4 },
  composerWrapper: {
    backgroundColor: colors.glassBackground,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.surfaceVariant,
    borderRadius: 20, // Squircle-like
    padding: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    fontFamily: typography.fonts.body,
    fontSize: 14,
    color: colors.onSurface,
    paddingTop: 10,
    paddingBottom: 10,
    minHeight: 40,
    maxHeight: 120,
    borderWidth: 0,
  },
  composerBtn: {
    padding: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  composerBtnActive: {
    backgroundColor: 'rgba(79, 70, 229, 0.2)', // primary with opacity
  },
  linkCard: {
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 213, 0.2)',
  },
  linkImage: { width: '100%', height: 120 },
  linkInfo: { padding: 10 },
  linkTitle: { fontFamily: typography.fonts.headline, fontWeight: 'bold', fontSize: 14 },
  linkDesc: { fontFamily: typography.fonts.body, fontSize: 12, opacity: 0.8, marginTop: 2 },
  voiceCard: { flexDirection: 'row', alignItems: 'center', marginTop: 4 }
});
