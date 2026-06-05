import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Bell, Heart, MessageCircle, UserPlus, Check } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

export default function NotificationsScreen() {
  const { session } = useAuthStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<any>();

  const fetchNotifications = async () => {
    if (!session?.user?.id) return;
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*, actor:actor_id(id, username, display_name, avatar_url)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(30);

      if (data) {
        setNotifications(data);
        // Mark all as read when opening screen
        const unreadIds = data.filter(n => !n.is_read).map(n => n.id);
        if (unreadIds.length > 0) {
          await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [session?.user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleNotificationPress = (notif: any) => {
    if (notif.type === 'like' || notif.type === 'comment') {
      // Navigate to post or profile
      navigation.navigate('Profile', { userId: session?.user?.id });
    } else {
      navigation.navigate('Profile', { userId: notif.actor_id });
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart size={14} color="#EF4444" fill="#EF4444" />;
      case 'comment': return <MessageCircle size={14} color="#3B82F6" fill="#3B82F6" />;
      case 'follow': return <UserPlus size={14} color="#10B981" />;
      case 'request_accepted': return <Check size={14} color="#6366F1" />;
      default: return <Bell size={14} color="#6B7280" />;
    }
  };

  const getMessage = (notif: any) => {
    const name = notif.actor?.display_name || notif.actor?.username || 'Someone';
    switch (notif.type) {
      case 'like': return <Text style={styles.messageText}><Text style={styles.boldText}>{name}</Text> liked your post.</Text>;
      case 'comment': return <Text style={styles.messageText}><Text style={styles.boldText}>{name}</Text> commented on your post.</Text>;
      case 'follow': return <Text style={styles.messageText}><Text style={styles.boldText}>{name}</Text> started following you.</Text>;
      case 'friend_request': return <Text style={styles.messageText}><Text style={styles.boldText}>{name}</Text> sent you a connection request.</Text>;
      case 'request_accepted': return <Text style={styles.messageText}><Text style={styles.boldText}>{name}</Text> accepted your request.</Text>;
      default: return <Text style={styles.messageText}>New notification from <Text style={styles.boldText}>{name}</Text>.</Text>;
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[styles.notificationItem, !item.is_read && styles.unreadItem]} 
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {item.actor?.avatar_url ? (
          <Image source={{ uri: item.actor.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarPlaceholderText}>{item.actor?.username?.[0]?.toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.iconBadge}>
          {getIcon(item.type)}
        </View>
      </View>
      
      <View style={styles.textContainer}>
        {getMessage(item)}
        <Text style={styles.timeText}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      
      {!item.is_read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>
      
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Bell size={48} color={colors.secondary} opacity={0.5} />
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontFamily: typography.fonts.headingBold,
    fontSize: 24,
    color: colors.text,
  },
  listContent: {
    paddingBottom: 100,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '50',
    alignItems: 'center',
  },
  unreadItem: {
    backgroundColor: colors.primary + '10',
  },
  avatarContainer: {
    marginRight: 12,
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    fontFamily: typography.fonts.headingBold,
    fontSize: 20,
    color: colors.secondary,
  },
  iconBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  textContainer: {
    flex: 1,
  },
  messageText: {
    fontFamily: typography.fonts.bodyRegular,
    fontSize: 15,
    color: colors.text,
    lineHeight: 20,
  },
  boldText: {
    fontFamily: typography.fonts.bodyBold,
  },
  timeText: {
    fontFamily: typography.fonts.labelRegular,
    fontSize: 12,
    color: colors.secondary,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontFamily: typography.fonts.bodyMedium,
    fontSize: 16,
    color: colors.secondary,
    marginTop: 16,
  }
});
