import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, SafeAreaView } from 'react-native';
import { Search, Bell, Shield, Plus, MoreVertical, Lock, Heart, MessageCircle, Share, BadgeCheck, Fingerprint } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { BottomNavBar } from '../components/BottomNavBar';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Shield color={colors.primary} size={24} />
          <Text style={styles.headerTitle}>GUFF</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn}>
            <Search color={colors.onSurfaceVariant} size={24} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Bell color={colors.onSurfaceVariant} size={24} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Stories Section */}
        <View style={styles.storiesSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesScroll}>
            {/* Own Story */}
            <TouchableOpacity style={styles.storyContainer}>
              <View style={styles.ownStoryWrapper}>
                <Image 
                  source={{ uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200' }} 
                  style={styles.storyImage} 
                />
                <View style={styles.addStoryBtn}>
                  <Plus size={16} color={colors.onPrimary} />
                </View>
              </View>
              <Text style={styles.storyText}>Your Story</Text>
            </TouchableOpacity>

            {/* Other Stories */}
            {[
              { id: 1, name: 'Elena', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200' },
              { id: 2, name: 'Marcus', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200' },
              { id: 3, name: 'Sasha', img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200' },
              { id: 4, name: 'Julian', img: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=200' }
            ].map(story => (
              <TouchableOpacity key={story.id} style={styles.storyContainer}>
                <View style={styles.activeStoryRing}>
                  <View style={styles.storyRingInner}>
                    <Image source={{ uri: story.img }} style={styles.storyImage} />
                  </View>
                </View>
                <Text style={styles.storyTextActive}>{story.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Bento Post Feed */}
        <View style={styles.bentoGrid}>
          {/* Large Post Card */}
          <View style={styles.largePost}>
            <View style={styles.postHeader}>
              <View style={styles.postHeaderLeft}>
                <Image 
                  source={{ uri: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200' }} 
                  style={styles.postAvatar} 
                />
                <View>
                  <Text style={styles.postAuthor}>Sarah Jenkins</Text>
                  <Text style={styles.postMeta}>
                    2 hours ago • <Text style={styles.metaHighlight}>SECURE</Text>
                  </Text>
                </View>
              </View>
              <TouchableOpacity>
                <MoreVertical color={colors.onSurfaceVariant} size={20} />
              </TouchableOpacity>
            </View>

            <View style={styles.postMediaContainer}>
              <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800' }} 
                style={styles.postMedia} 
              />
              <View style={styles.encryptedBadge}>
                <Lock size={12} color={colors.primary} />
                <Text style={styles.encryptedBadgeText}>ENCRYPTED MEDIA</Text>
              </View>
            </View>

            <View style={styles.postContent}>
              <Text style={styles.postText}>
                Finalizing the architecture for the new headquarters. Safety and clarity remain our core priorities for 2024. #Design #Security
              </Text>
              <View style={styles.postActions}>
                <View style={styles.actionGroup}>
                  <TouchableOpacity style={styles.actionBtn}>
                    <Heart size={20} color={colors.onSurfaceVariant} />
                    <Text style={styles.actionText}>1.2k</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn}>
                    <MessageCircle size={20} color={colors.onSurfaceVariant} />
                    <Text style={styles.actionText}>48</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity>
                  <Share size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Mini Posts Row */}
          <View style={styles.miniPostsRow}>
            {/* Mini Post 1 */}
            <View style={[styles.miniPost, { marginRight: 8 }]}>
              <View style={styles.miniPostMediaWrapper}>
                <Image 
                  source={{ uri: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=400' }} 
                  style={styles.miniPostMedia} 
                />
                <View style={styles.miniPostOverlay}>
                  <Text style={styles.miniPostTag}>System Update</Text>
                  <Text style={styles.miniPostTitle}>v2.4.0 Secure Core</Text>
                </View>
              </View>
            </View>

            {/* Mini Post 2 */}
            <View style={[styles.miniPost, { marginLeft: 8 }]}>
              <View style={styles.miniPostMediaWrapper}>
                <Image 
                  source={{ uri: 'https://images.unsplash.com/photo-1506815340332-9c9c3e988226?auto=format&fit=crop&q=80&w=400' }} 
                  style={styles.miniPostMedia} 
                />
              </View>
              <View style={styles.miniPostContent}>
                <View style={styles.miniPostHeader}>
                  <BadgeCheck size={12} color={colors.primary} />
                  <Text style={styles.miniPostLocation}>GUFF HQ</Text>
                </View>
                <Text style={styles.miniPostDesc} numberOfLines={2}>
                  New security protocols deployed across all nodes.
                </Text>
              </View>
            </View>
          </View>

          {/* Horizontal Bento Feature */}
          <View style={styles.featureCard}>
            <View style={styles.featureContent}>
              <View style={styles.featureBadge}>
                <Text style={styles.featureBadgeText}>SECURITY ALERT</Text>
              </View>
              <Text style={styles.featureTitle}>Biometric Sync</Text>
              <Text style={styles.featureDesc}>
                Enhance your vault with multi-layered facial recognition.
              </Text>
            </View>
            <View style={styles.featureIconWrapper}>
              <Fingerprint size={32} color={colors.onPrimaryContainer} />
            </View>
          </View>

        </View>
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
    backgroundColor: 'rgba(9, 9, 11, 0.8)', // Dark background with opacity
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontFamily: typography.fonts.headline,
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 16,
  },
  iconBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  storiesSection: {
    paddingVertical: 16,
  },
  storiesScroll: {
    paddingHorizontal: 16,
    gap: 16,
  },
  storyContainer: {
    alignItems: 'center',
    gap: 8,
    width: 64,
  },
  ownStoryWrapper: {
    position: 'relative',
    width: 64,
    height: 64,
    borderRadius: 24, // squircle approximation
    borderWidth: 2,
    borderColor: colors.surfaceContainer,
  },
  storyImage: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  addStoryBtn: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 2,
    borderWidth: 2,
    borderColor: colors.background,
  },
  storyText: {
    fontFamily: typography.fonts.labelBold,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  storyTextActive: {
    fontFamily: typography.fonts.labelBold,
    fontSize: 12,
    color: colors.onSurface,
  },
  activeStoryRing: {
    width: 64,
    height: 64,
    borderRadius: 24,
    padding: 3,
    backgroundColor: colors.secondaryContainer, // fallback for gradient
  },
  storyRingInner: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background,
    borderRadius: 21,
    padding: 2,
  },
  bentoGrid: {
    paddingHorizontal: 16,
    gap: 16,
  },
  largePost: {
    backgroundColor: colors.glassBackground,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  postHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  postAvatar: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: colors.primaryContainer,
  },
  postAuthor: {
    fontFamily: typography.fonts.headline,
    fontSize: 14,
    color: colors.onSurface,
  },
  postMeta: {
    fontFamily: typography.fonts.labelBold,
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  metaHighlight: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  postMediaContainer: {
    position: 'relative',
    aspectRatio: 16 / 9,
  },
  postMedia: {
    width: '100%',
    height: '100%',
  },
  encryptedBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(226, 223, 255, 0.7)', // primary-fixed with opacity
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  encryptedBadgeText: {
    fontFamily: typography.fonts.labelBold,
    fontSize: 10,
    color: colors.primary,
  },
  postContent: {
    padding: 16,
  },
  postText: {
    fontFamily: typography.fonts.body,
    fontSize: 14,
    color: colors.onSurface,
    lineHeight: 20,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  actionGroup: {
    flexDirection: 'row',
    gap: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontFamily: typography.fonts.labelBold,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  miniPostsRow: {
    flexDirection: 'row',
  },
  miniPost: {
    flex: 1,
    backgroundColor: colors.glassBackground,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  miniPostMediaWrapper: {
    aspectRatio: 1,
    position: 'relative',
  },
  miniPostMedia: {
    width: '100%',
    height: '100%',
  },
  miniPostOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.4)', // Simplified gradient
  },
  miniPostTag: {
    fontFamily: typography.fonts.labelBold,
    fontSize: 10,
    color: '#fff',
    marginBottom: 4,
  },
  miniPostTitle: {
    fontFamily: typography.fonts.headline,
    fontSize: 14,
    color: '#fff',
  },
  miniPostContent: {
    padding: 12,
  },
  miniPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  miniPostLocation: {
    fontFamily: typography.fonts.labelBold,
    fontSize: 10,
    color: colors.primary,
  },
  miniPostDesc: {
    fontFamily: typography.fonts.labelBold,
    fontSize: 11,
    color: colors.onSurface,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryContainer,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 16,
  },
  featureContent: {
    flex: 1,
    paddingRight: 16,
  },
  featureBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(177, 175, 255, 0.2)', // on-primary-container with opacity
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginBottom: 8,
  },
  featureBadgeText: {
    fontFamily: typography.fonts.labelBold,
    fontSize: 10,
    color: colors.onPrimaryContainer,
  },
  featureTitle: {
    fontFamily: typography.fonts.headline,
    fontSize: 20,
    color: colors.onPrimaryContainer,
    marginBottom: 4,
  },
  featureDesc: {
    fontFamily: typography.fonts.body,
    fontSize: 13,
    color: colors.onPrimaryContainer,
    opacity: 0.9,
  },
  featureIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  }
});
