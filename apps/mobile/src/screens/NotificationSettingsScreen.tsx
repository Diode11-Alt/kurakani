import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, Alert } from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import { colors } from '../theme/colors';
import { API_BASE } from '../lib/api';

export default function NotificationSettingsScreen() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [previewEnabled, setPreviewEnabled] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE}/settings/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPushEnabled(data.pushNotifications);
        setPreviewEnabled(data.notificationPreview);
      }
    } catch {}
  }

  async function updateSetting(key: string, value: boolean) {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      await fetch(`${API_BASE}/settings/notifications`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
    } catch {
      Alert.alert('Error', 'Failed to update setting');
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Notifications</Text>

      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text style={styles.switchLabel}>Push Notifications</Text>
            <Text style={styles.switchSubtitle}>Receive notifications when the app is in the background</Text>
          </View>
          <Switch
            value={pushEnabled}
            onValueChange={(val) => { setPushEnabled(val); updateSetting('pushNotifications', val); }}
            trackColor={{ false: '#D1D5DB', true: colors.primary }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text style={styles.switchLabel}>Message Preview</Text>
            <Text style={styles.switchSubtitle}>Show message content in notification banners</Text>
          </View>
          <Switch
            value={previewEnabled}
            onValueChange={(val) => { setPreviewEnabled(val); updateSetting('notificationPreview', val); }}
            trackColor={{ false: '#D1D5DB', true: colors.primary }}
            thumbColor="#fff"
          />
        </View>
      </View>

      <Text style={styles.note}>
        Note: Kurakani never includes message content in push notifications by default. 
        Enabling preview will show a brief excerpt — the content is still encrypted in transit.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20 },
  header: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 20 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  switchInfo: { flex: 1, marginRight: 16 },
  switchLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  switchSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  note: { fontSize: 12, color: colors.textSecondary, lineHeight: 18, marginTop: 16, paddingHorizontal: 4 },
});
