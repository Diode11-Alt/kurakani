import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TextInput, TouchableOpacity, Image } from 'react-native';
import { Search, Menu, User } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { BottomNavBar } from '../components/BottomNavBar';

export default function ExploreScreen() {
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
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Search color={colors.outline} size={20} style={styles.searchIcon} />
            <TextInput 
              style={styles.searchInput}
              placeholder="Search curated knowledge..."
              placeholderTextColor={colors.outline}
            />
          </View>
        </View>

        {/* Taxonomies */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Taxonomies</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsContainer}>
            <TouchableOpacity style={styles.pillActive}>
              <Text style={styles.pillActiveText}>Post-Quantum</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pillInactive}>
              <Text style={styles.pillInactiveText}>Mesh Nodes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pillInactive}>
              <Text style={styles.pillInactiveText}>Zero-Knowledge</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Trending Architectures */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trending Architectures</Text>
            <Text style={styles.viewArchiveText}>View Archive</Text>
          </View>

          <View style={styles.largeCard}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800' }} 
              style={styles.cardImage} 
            />
            <View style={styles.cardOverlay}>
              <View style={styles.tagBadge}>
                <Text style={styles.tagText}>THESIS</Text>
              </View>
              <Text style={styles.cardTitle}>The Decentralization of Trust in Sub-Orbital Networks</Text>
            </View>
          </View>

          <View style={styles.smallCard}>
            <Text style={styles.smallCardTitle}>Kinetic Topology</Text>
            <Text style={styles.smallCardDesc}>Abstract data structuring for predictive traffic routing.</Text>
            <View style={styles.authorRow}>
              <View style={styles.authorInitials}>
                <Text style={styles.authorInitialsText}>JD</Text>
              </View>
              <Text style={styles.authorName}>Dr. J. Doe</Text>
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
    backgroundColor: colors.surfaceBright,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  scrollContent: {
    paddingBottom: 100,
  },
  searchSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
    marginTop: 8,
  },
  searchContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 213, 0.3)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingRight: 16,
    paddingLeft: 44,
    fontFamily: typography.fonts.body,
    fontSize: 14,
    color: colors.onSurface,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: typography.fonts.headline,
    fontSize: 20,
    color: colors.onSurface,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  viewArchiveText: {
    fontFamily: typography.fonts.bodyMedium,
    color: colors.primary,
    fontSize: 14,
  },
  pillsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  pillActive: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
  },
  pillActiveText: {
    fontFamily: typography.fonts.labelBold,
    color: colors.onPrimaryContainer,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  pillInactive: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 213, 0.15)',
  },
  pillInactiveText: {
    fontFamily: typography.fonts.labelBold,
    color: colors.onSurface,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  largeCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    height: 220,
    marginBottom: 16,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', // Simplified gradient
  },
  tagBadge: {
    backgroundColor: colors.tertiaryContainer,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 12,
  },
  tagText: {
    fontFamily: typography.fonts.labelBold,
    fontSize: 10,
    color: colors.onTertiaryContainer,
    letterSpacing: 1,
  },
  cardTitle: {
    fontFamily: typography.fonts.headline,
    fontSize: 22,
    color: colors.surfaceBright,
    lineHeight: 28,
  },
  smallCard: {
    marginHorizontal: 16,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 213, 0.15)',
  },
  smallCardTitle: {
    fontFamily: typography.fonts.headline,
    fontSize: 18,
    color: colors.onSurface,
    marginBottom: 8,
  },
  smallCardDesc: {
    fontFamily: typography.fonts.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 8,
  },
  authorInitials: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorInitialsText: {
    fontFamily: typography.fonts.labelBold,
    fontSize: 10,
    color: colors.primary,
  },
  authorName: {
    fontFamily: typography.fonts.body,
    fontSize: 12,
    color: colors.secondary,
  }
});
