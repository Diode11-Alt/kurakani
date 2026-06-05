import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Newspaper, Bell, MessageCircle, User, Plus } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export const BottomNavBar = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { session } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!session?.user?.id) return;
    const userId = session.user.id;

    const fetchUnread = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('is_read', false);
      if (data) setUnreadCount(data.length);
    };

    fetchUnread();

    const channel = supabase
      .channel('public:notifications:mobile')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  const leftTabs = [
    { name: 'Home', icon: Newspaper, label: 'Feed' },
    { name: 'Notifications', icon: Bell, label: 'Alerts', badge: unreadCount },
  ];
  
  const rightTabs = [
    { name: 'Messages', icon: MessageCircle, label: 'Messages' },
    { name: 'Profile', icon: User, label: 'Profile' },
  ];

  const renderTab = (tab: any) => {
    const isActive = route.name === tab.name || (route.name === 'Chat' && tab.name === 'Messages');
    const Icon = tab.icon;
    
    return (
      <TouchableOpacity 
        key={tab.name}
        style={styles.tab}
        activeOpacity={0.7}
        onPress={() => navigation.navigate(tab.name)}
      >
        <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
          <Icon 
            size={24} 
            color={isActive ? colors.primary : colors.secondary}
            strokeWidth={isActive ? 2.5 : 2}
          />
          {tab.badge > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{tab.badge > 99 ? '99+' : tab.badge}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.label, isActive && styles.activeLabel]}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.navBar}>
        {leftTabs.map(renderTab)}
        
        {/* Center FAB */}
        <TouchableOpacity style={styles.fab} activeOpacity={0.8}>
          <Plus size={28} color={colors.onPrimary} strokeWidth={2.5} />
        </TouchableOpacity>

        {rightTabs.map(renderTab)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)', // Simulated glassmorphism
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 8,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
  },
  iconContainer: {
    marginBottom: 4,
    padding: 6,
    borderRadius: 20,
  },
  activeIconContainer: {
    backgroundColor: 'transparent',
  },
  label: {
    fontFamily: typography.fonts.labelBold,
    fontSize: 10,
    color: colors.secondary,
    letterSpacing: 0.5,
  },
  activeLabel: {
    color: colors.primary,
  },
  fab: {
    position: 'relative',
    top: -16,
    width: 56,
    height: 56,
    borderRadius: 24, // squircle
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.error || '#FF3B30',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontFamily: typography.fonts.labelBold,
  }
});
