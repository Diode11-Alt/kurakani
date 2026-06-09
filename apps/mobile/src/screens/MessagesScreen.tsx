import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TextInput, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Search, Menu, Lock, BadgeCheck } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { BottomNavBar } from '../components/BottomNavBar';
import { supabase } from '../lib/supabase';
import EncryptedStorage from 'react-native-encrypted-storage';

export default function MessagesScreen({ navigation }: { navigation: Record<string, unknown> }) {
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const userStr = await EncryptedStorage.getItem('signal_user');
        const currentUser = userStr ? JSON.parse(userStr) : null;
        
        const { data, error } = await supabase
          .from('users')
          .select('id, name, phone, avatar_url, public_key');
          
        if (data) {
          if (currentUser) {
            setUsers(data.filter(u => u.id !== currentUser.id));
          } else {
            setUsers(data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch users:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, []);
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn}>
          <Menu color={colors.onSurfaceVariant} size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Alexandria</Text>
        <TouchableOpacity style={styles.headerBtn}>
          <Search color={colors.onSurfaceVariant} size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Search color={colors.onSurfaceVariant} size={20} style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search secure channels"
            placeholderTextColor={colors.onSurfaceVariant}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContainer}>
          <TouchableOpacity style={styles.filterActive}>
            <Text style={styles.filterActiveText}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterInactive}>
            <Text style={styles.filterInactiveText}>Unread</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterInactive}>
            <Text style={styles.filterInactiveText}>Groups</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterInactive}>
            <Text style={styles.filterInactiveText}>Vaults</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : users.length === 0 ? (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ color: colors.onSurfaceVariant, fontFamily: typography.fonts.body }}>No secure contacts found</Text>
          </View>
        ) : (
          users.map((user) => (
            <TouchableOpacity 
              key={user.id}
              style={styles.threadItem}
              onPress={() => navigation.navigate('Chat', { id: user.id, name: user.name || user.phone })}
            >
              <View style={styles.avatarContainer}>
                {user.avatar_url ? (
                  <Image 
                    source={{ uri: user.avatar_url }} 
                    style={styles.avatar} 
                  />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: colors.surfaceContainerHighest, justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ color: colors.onSurface, fontSize: 20, fontWeight: 'bold' }}>
                      {(user.name || user.phone || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.verifiedBadge}>
                  <BadgeCheck size={12} color={colors.onTertiary} fill={colors.tertiary} />
                </View>
              </View>
              
              <View style={styles.threadContent}>
                <View style={styles.threadHeader}>
                  <Text style={styles.threadName} numberOfLines={1}>{user.name || 'Unknown'}</Text>
                </View>
                <View style={styles.threadSnippet}>
                  <Lock size={14} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.snippetText} numberOfLines={1}>
                    {user.phone ? user.phone : 'Tap to start secure chat'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
        
        <View style={styles.divider} />
      </ScrollView>
      <BottomNavBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surfaceContainerLow,
  },
  headerBtn: {
    padding: 8,
  },
  title: {
    fontFamily: typography.fonts.headline,
    fontSize: 24,
    color: colors.primary,
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: colors.surfaceContainerLowest,
  },
  searchContainer: {
    position: 'relative',
    justifyContent: 'center',
    marginBottom: 24,
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 213, 0.15)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingRight: 16,
    paddingLeft: 48,
    fontFamily: typography.fonts.body,
    fontSize: 14,
    color: colors.onSurface,
  },
  filtersContainer: {
    gap: 8,
  },
  filterActive: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
  },
  filterActiveText: {
    fontFamily: typography.fonts.labelBold,
    color: colors.onPrimaryContainer,
    fontSize: 12,
  },
  filterInactive: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
  },
  filterInactiveText: {
    fontFamily: typography.fonts.labelBold,
    color: colors.onSurfaceVariant,
    fontSize: 12,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  threadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.surfaceContainerLowest,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 10,
    padding: 2,
  },
  threadContent: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 8,
  },
  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  threadName: {
    fontFamily: typography.fonts.headline,
    fontWeight: 'bold',
    fontSize: 16,
    color: colors.onSurface,
    flex: 1,
  },
  threadTime: {
    fontFamily: typography.fonts.labelBold,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    marginLeft: 8,
  },
  unreadTime: {
    color: colors.primary,
  },
  threadSnippet: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  snippetText: {
    fontFamily: typography.fonts.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  unreadText: {
    fontFamily: typography.fonts.bodyMedium,
    color: colors.onSurface,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadBadgeText: {
    fontFamily: typography.fonts.labelBold,
    fontSize: 10,
    color: colors.onPrimary,
  },
  divider: {
    height: 4,
    backgroundColor: colors.surfaceContainerLow,
    width: '100%',
  }
});
