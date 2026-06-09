import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';

interface Props {
  navigation: { navigate: (screen: string) => void };
}

interface SettingsItem {
  label: string;
  subtitle: string;
  screen: string | null;
  icon: string;
  danger?: boolean;
}

export default function SettingsScreen({ navigation }: Props) {
  const sections = [
    {
      title: 'Account',
      items: [
        { label: 'Profile', subtitle: 'Username, photo, bio', screen: 'ProfileSettings', icon: '👤' },
        { label: 'Privacy', subtitle: 'Last seen, read receipts', screen: 'PrivacySettings', icon: '🛡️' },
        { label: 'Notifications', subtitle: 'Push, sound, preview', screen: 'NotificationSettings', icon: '🔔' },
        { label: 'Account', subtitle: 'Change number, delete account', screen: 'Account', icon: '⚙️' },
      ] as SettingsItem[],
    },
    {
      title: 'Security',
      items: [
        { label: 'Linked Devices', subtitle: 'Manage connected devices', screen: null, icon: '📱' },
        { label: 'App Lock', subtitle: 'PIN or biometric', screen: null, icon: '🔒' },
      ] as SettingsItem[],
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Settings</Text>

      {sections.map((section, si) => (
        <View key={si} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>

          <View style={styles.card}>
            {section.items.map((item: SettingsItem, ii) => (
              <TouchableOpacity
                key={ii}
                style={[styles.row, ii < section.items.length - 1 && styles.rowBorder]}
                onPress={() => {
                  if (item.screen) navigation.navigate(item.screen);
                }}
              >
                <Text style={styles.icon}>{item.icon}</Text>
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, item.danger && styles.dangerText]}>{item.label}</Text>
                  <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <Text style={styles.version}>Kurakani v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  header: { fontSize: 28, fontWeight: '700', color: colors.onSurface, marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, paddingLeft: 4 },
  card: { backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.outline },
  icon: { fontSize: 22, marginRight: 14 },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 16, fontWeight: '500', color: colors.onSurface },
  rowSubtitle: { fontSize: 13, color: colors.onSurfaceVariant, marginTop: 2 },
  dangerText: { color: '#EF4444' },
  chevron: { fontSize: 22, color: colors.onSurfaceVariant },
  version: { textAlign: 'center', fontSize: 12, color: colors.onSurfaceVariant, marginTop: 16 },
});
