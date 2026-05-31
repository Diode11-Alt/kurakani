import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Image, Linking } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/RootNavigator';
import { colors } from '../theme/colors';
import { Send, Mic, Phone, Video, Info, Paperclip } from 'lucide-react-native';
import { getMessages, saveMessage, SignalProtocolStore } from '../signal/SignalStore';
import { useSocket } from '../signal/SocketContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SignalProtocolAddress, SessionCipher } from '@privacyresearch/libsignal-protocol-typescript';

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;

export default function ChatScreen() {
  const route = useRoute<ChatScreenRouteProp>();
  const { id: activeContact, name } = route.params;
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
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

      const store = new SignalProtocolStore();
      const address = new SignalProtocolAddress(payload.fromUserId, 1);
      const cipher = new SessionCipher(store, address);

      try {
        let plaintextArrayBuffer;
        if (payload.ciphertextType === 3) {
          plaintextArrayBuffer = await cipher.decryptPreKeyWhisperMessage(payload.ciphertext, 'binary');
        } else {
          plaintextArrayBuffer = await cipher.decryptWhisperMessage(payload.ciphertext, 'binary');
        }

        // Convert array buffer to string
        const bytes = new Uint8Array(plaintextArrayBuffer);
        let plaintext = '';
        for (let i = 0; i < bytes.length; i++) {
          plaintext += String.fromCharCode(bytes[i]);
        }

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

    const store = new SignalProtocolStore();
    const address = new SignalProtocolAddress(activeContact, 1);
    const cipher = new SessionCipher(store, address);

    try {
      // String to buffer
      const buf = new ArrayBuffer(payloadString.length);
      const bufView = new Uint8Array(buf);
      for (let i = 0, strLen = payloadString.length; i < strLen; i++) {
        bufView[i] = payloadString.charCodeAt(i);
      }

      const ciphertextMessage = await cipher.encrypt(buf);

      // Sending raw websocket frame using socket.io
      socket.send(JSON.stringify({
        type: 'message:send',
        recipientId: activeContact,
        ciphertext: ciphertextMessage.body,
        ciphertextType: ciphertextMessage.type
      }));
    } catch (err) {
      console.error('Encryption failed', err);
    }
  };

  const renderItem = ({ item, index }: { item: any, index: number }) => {
    const isFirstInGroup = index === 0 || messages[index - 1].sent !== item.sent;

    return (
      <View style={[styles.messageWrapper, item.sent ? styles.messageSentWrapper : styles.messageReceivedWrapper, isFirstInGroup && { marginTop: 12 }]}>
        <View style={[styles.messageBubble, item.sent ? styles.messageBubbleSent : styles.messageBubbleReceived]}>
          <Text style={[styles.messageText, item.sent ? styles.messageTextSent : styles.messageTextReceived]}>
            {item.text}
          </Text>

          {item.attachment?.type === 'link' && item.attachment.data && (
            <TouchableOpacity onPress={() => Linking.openURL(item.attachment.data.url)} style={styles.linkCard}>
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
            <View style={styles.voiceCard}>
              <Mic size={20} color={item.sent ? "#fff" : "#000"} />
              <Text style={item.sent ? styles.messageTextSent : styles.messageTextReceived}> Voice Message</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
          <Paperclip size={22} color={colors.primary} />
        </TouchableOpacity>
        <TextInput
          style={[styles.input, isInputFocused && styles.inputFocused]}
          placeholder="Type a message..."
          placeholderTextColor={colors.textSecondary}
          value={input}
          onChangeText={setInput}
          multiline
          onFocus={() => setIsInputFocused(true)}
          onBlur={() => setIsInputFocused(false)}
        />
        {input.trim() ? (
          <TouchableOpacity onPress={handleSend} style={styles.iconButton} activeOpacity={0.7}>
            <Send size={22} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
            <Mic size={22} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: 16, paddingBottom: 24 },
  messageWrapper: { maxWidth: '78%', marginBottom: 3 },
  messageSentWrapper: { alignSelf: 'flex-end' },
  messageReceivedWrapper: { alignSelf: 'flex-start' },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  messageBubbleSent: {
    backgroundColor: colors.outgoingBubble,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 4, // asymmetrical right tail
  },
  messageBubbleReceived: {
    backgroundColor: colors.incomingBubble,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 4, // asymmetrical left tail
    borderBottomRightRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: { fontSize: 16, lineHeight: 22 },
  messageTextSent: { color: colors.outgoingText },
  messageTextReceived: { color: colors.incomingText },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    minHeight: 40,
    maxHeight: 100,
    fontSize: 15,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  iconButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 20,
    width: 38,
    height: 38,
  },
  linkCard: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkImage: { width: '100%', height: 120 },
  linkInfo: { padding: 10 },
  linkTitle: { fontWeight: 'bold', fontSize: 14 },
  linkDesc: { fontSize: 12, opacity: 0.8, marginTop: 2 },
  voiceCard: { flexDirection: 'row', alignItems: 'center', marginTop: 4 }
});
