import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { colors } from '../theme/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSocket } from '../signal/SocketContext';
import { getMessages } from '../signal/SignalStore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface Contact {
  id: string;
  name: string;
  phone: string;
  unread: number;
  lastMessage?: string;
  time?: string;
}

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { socket } = useSocket();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = await AsyncStorage.getItem('signal_token');
      if (!token) {
        navigation.replace('Login');
        return;
      }
      const res = await fetch(`http://localhost:4000/api/auth/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const users = await res.json();
      
      const contactsWithMeta = await Promise.all(users.map(async (u: any) => {
        const msgs = await getMessages(u.id);
        const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
        return {
          id: u.id,
          name: u.username,
          phone: u.phone,
          unread: 0,
          lastMessage: lastMsg ? (lastMsg.attachment ? (lastMsg.attachment.type === 'voice' ? '🎤 Voice message' : '📁 Attachment') : lastMsg.text) : 'Tap to chat',
          time: lastMsg ? lastMsg.time : ''
        };
      }));

      setContacts(contactsWithMeta);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone.includes(searchQuery)
  );

  const renderItem = ({ item }: { item: Contact }) => (
    <TouchableOpacity 
      style={styles.chatItem}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('Chat', { id: item.id, name: item.name })}
    >
      <View style={styles.avatarContainer}>
         <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
         </View>
        {item.unread > 0 && <View style={styles.onlineBadge} />}
      </View>
      
      <View style={styles.chatDetails}>
        <Text style={[styles.chatName, item.unread > 0 && styles.chatNameUnread]}>
          {item.name}
        </Text>
        <Text style={[styles.lastMessage, item.unread > 0 && styles.lastMessageUnread]} numberOfLines={1}>
          {item.lastMessage}
        </Text>
      </View>
      
      <View style={styles.chatMeta}>
        <Text style={styles.time}>{item.time}</Text>
        {item.unread > 0 && <View style={styles.unreadDot} />}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, isSearchFocused && styles.searchBarFocused]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput 
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
        </View>
      </View>
      <FlatList
        data={filteredContacts}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onRefresh={fetchUsers}
        refreshing={loading}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 12 },
  searchBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.surface, 
    borderRadius: 12, 
    paddingHorizontal: 12, 
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchBarFocused: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  searchIcon: { marginRight: 8, fontSize: 16 },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  listContent: { paddingBottom: 24 },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 84, // Align with details list offset
  },
  chatItem: { 
    flexDirection: 'row', 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  avatarContainer: { position: 'relative' },
  avatarPlaceholder: { 
    width: 56, 
    height: 56, 
    borderRadius: 16, // squircle avatar
    backgroundColor: colors.primary, 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  onlineBadge: { 
    position: 'absolute', 
    bottom: -2, 
    right: -2, 
    width: 14, 
    height: 14, 
    borderRadius: 7, 
    backgroundColor: colors.statusOnline, 
    borderWidth: 2, 
    borderColor: colors.surface,
  },
  chatDetails: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  chatName: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  chatNameUnread: { color: colors.primary, fontWeight: '800' },
  lastMessage: { fontSize: 14, color: colors.textSecondary },
  lastMessageUnread: { color: colors.text, fontWeight: '700' },
  chatMeta: { alignItems: 'flex-end', justifyContent: 'center', marginLeft: 8 },
  time: { fontSize: 12, color: colors.textSecondary, marginBottom: 6 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }
});
