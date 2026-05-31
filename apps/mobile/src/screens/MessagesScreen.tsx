import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TextInput, TouchableOpacity, Image } from 'react-native';
import { Search, Menu, Lock, BadgeCheck } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { BottomNavBar } from '../components/BottomNavBar';

export default function MessagesScreen({ navigation }: any) {
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
        {/* Thread 1 */}
        <TouchableOpacity 
          style={styles.threadItem}
          onPress={() => navigation.navigate('Chat', { id: '1', name: 'Dr. Elias Vance' })}
        >
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200' }} 
              style={styles.avatar} 
            />
            <View style={styles.verifiedBadge}>
              <BadgeCheck size={12} color={colors.onTertiary} fill={colors.tertiary} />
            </View>
          </View>
          
          <View style={styles.threadContent}>
            <View style={styles.threadHeader}>
              <Text style={styles.threadName} numberOfLines={1}>Dr. Elias Vance</Text>
              <Text style={[styles.threadTime, styles.unreadTime]}>10:42 AM</Text>
            </View>
            <View style={styles.threadSnippet}>
              <Lock size={14} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.snippetText, styles.unreadText]} numberOfLines={1}>
                The encrypted archival files are ready for review.
              </Text>
            </View>
          </View>

          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>3</Text>
          </View>
        </TouchableOpacity>

        {/* Thread 2 */}
        <TouchableOpacity 
          style={styles.threadItem}
          onPress={() => navigation.navigate('Chat', { id: '2', name: 'Curatorial Board' })}
        >
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200' }} 
              style={styles.avatar} 
            />
          </View>
          
          <View style={styles.threadContent}>
            <View style={styles.threadHeader}>
              <Text style={styles.threadName} numberOfLines={1}>Curatorial Board</Text>
              <Text style={styles.threadTime}>Yesterday</Text>
            </View>
            <View style={styles.threadSnippet}>
              <Text style={styles.snippetText} numberOfLines={1}>
                Sarah: We need to finalize the typography hierarchy.
              </Text>
            </View>
          </View>
        </TouchableOpacity>
        
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
