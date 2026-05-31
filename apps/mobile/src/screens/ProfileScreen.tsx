import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Search, Menu, Plus } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { BottomNavBar } from '../components/BottomNavBar';

export default function ProfileScreen() {
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
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400' }} 
              style={styles.avatar} 
            />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>Julian Thorne</Text>
            <Text style={styles.role}>LEAD SECURITY ARCHITECT • CYBERNETIC SYSTEMS DIVISION</Text>
            <Text style={styles.bio}>
              Specializing in robust architectural frameworks and counter-intrusion methodologies. Over fifteen years of dedicated service in analyzing and neutralizing advanced persistent threats within highly classified environments.
            </Text>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.connectBtn}>
                <Text style={styles.connectBtnText}>Connect</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.messageBtn}>
                <Text style={styles.messageBtnText}>Message</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Stats Bento Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.primary }]}>842</Text>
            <Text style={styles.statLabel}>NETWORK CONNECTIONS</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.tertiary }]}>Level 7</Text>
            <Text style={styles.statLabel}>SECURITY CLEARANCE</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.primary }]}>99.4</Text>
            <Text style={styles.statLabel}>REPUTATION SCORE</Text>
          </View>
        </View>

        {/* Recent Insights */}
        <View style={styles.insightsSection}>
          <View style={styles.insightsHeader}>
            <Text style={styles.insightsTitle}>Recent Insights</Text>
          </View>

          {/* Insight Card 1 */}
          <TouchableOpacity style={styles.insightCard}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=400' }} 
              style={styles.insightImage} 
            />
            <View style={styles.insightContent}>
              <Text style={styles.insightTag}>TECHNICAL PUBLICATION</Text>
              <Text style={styles.insightHeading} numberOfLines={2}>
                Quantum Encryption Protocols in Decentralized Nodes
              </Text>
              <Text style={styles.insightDesc} numberOfLines={2}>
                An analysis of the structural vulnerabilities present in legacy decentralized networks when exposed to quantum-level computational brute force attacks, proposing a novel algorithmic defense.
              </Text>
              <Text style={styles.insightMeta}>Published Oct 12, 2023 • 14 min read</Text>
            </View>
          </TouchableOpacity>

          {/* Insight Card 2 */}
          <TouchableOpacity style={styles.insightCard}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=400' }} 
              style={styles.insightImage} 
            />
            <View style={styles.insightContent}>
              <Text style={styles.insightTag}>FIELD REPORT</Text>
              <Text style={styles.insightHeading} numberOfLines={2}>
                Mitigating Cascading Failures in Core Architectures
              </Text>
              <Text style={styles.insightDesc} numberOfLines={2}>
                A post-mortem review of the recent sector-wide outage, detailing the structural flaws in failover redundancy and establishing new mandates for critical system compartmentalization.
              </Text>
              <Text style={styles.insightMeta}>Published Sep 28, 2023 • 8 min read</Text>
            </View>
          </TouchableOpacity>
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
  scrollContent: {
    paddingBottom: 100,
    paddingTop: 24,
  },
  profileHeader: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  avatarContainer: {
    width: 128,
    height: 128,
    borderRadius: 64,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerHighest,
    marginBottom: 24,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  profileInfo: {
    gap: 16,
  },
  name: {
    fontFamily: typography.fonts.headline,
    fontSize: 36,
    color: colors.primary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  role: {
    fontFamily: typography.fonts.labelBold,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    letterSpacing: 1.5,
  },
  bio: {
    fontFamily: typography.fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.onSurfaceVariant,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  connectBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  connectBtnText: {
    fontFamily: typography.fonts.labelBold,
    fontSize: 14,
    color: colors.onPrimary,
  },
  messageBtn: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  messageBtnText: {
    fontFamily: typography.fonts.labelBold,
    fontSize: 14,
    color: colors.primary,
  },
  statsGrid: {
    paddingHorizontal: 24,
    gap: 16,
    marginBottom: 40,
  },
  statCard: {
    backgroundColor: colors.surfaceContainerLow,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontFamily: typography.fonts.headline,
    fontSize: 40,
    marginBottom: 8,
  },
  statLabel: {
    fontFamily: typography.fonts.labelBold,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    letterSpacing: 1.5,
  },
  insightsSection: {
    paddingHorizontal: 24,
  },
  insightsHeader: {
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHighest,
    paddingBottom: 16,
    marginBottom: 24,
  },
  insightsTitle: {
    fontFamily: typography.fonts.headline,
    fontSize: 24,
    color: colors.onSurface,
  },
  insightCard: {
    flexDirection: 'column',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 213, 0.15)',
    marginBottom: 24,
    overflow: 'hidden',
  },
  insightImage: {
    width: '100%',
    height: 180,
    backgroundColor: colors.surfaceContainerHigh,
  },
  insightContent: {
    padding: 24,
  },
  insightTag: {
    fontFamily: typography.fonts.labelBold,
    fontSize: 10,
    color: colors.tertiary,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  insightHeading: {
    fontFamily: typography.fonts.headline,
    fontSize: 20,
    color: colors.onSurface,
    marginBottom: 12,
  },
  insightDesc: {
    fontFamily: typography.fonts.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 16,
  },
  insightMeta: {
    fontFamily: typography.fonts.body,
    fontSize: 12,
    color: colors.secondary,
  }
});
