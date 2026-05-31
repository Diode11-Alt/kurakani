import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';

export default function PrivacySettingsScreen() {
  const [lastSeen, setLastSeen] = useState('everyone');
  const [readReceipts, setReadReceipts] = useState(true);
  const [profilePhoto, setProfilePhoto] = useState('everyone');

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/settings/privacy', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLastSeen(data.lastSeen);
        setReadReceipts(data.readReceipts);
        setProfilePhoto(data.profilePhotoVisibility);
      }
    } catch {}
  }

  async function updateSetting(key: string, value: any) {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      await fetch('http://localhost:4000/api/settings/privacy', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
    } catch {
      Alert.alert('Error', 'Failed to update setting');
    }
  }

  const OptionRow = ({ label, options, value, settingKey }: any) => (
    <View style={styles.optionGroup}>
      <Text style={styles.optionLabel}>{label}</Text>
      <View style={styles.optionButtons}>
        {options.map((opt: string) => (
          <View key={opt} style={[styles.optionBtn, value === opt && styles.optionBtnActive]}>
            <Text
              style={[styles.optionBtnText, value === opt && styles.optionBtnTextActive]}
              onPress={() => {
                if (settingKey === 'lastSeen') setLastSeen(opt);
                if (settingKey === 'profilePhotoVisibility') setProfilePhoto(opt);
                updateSetting(settingKey, opt);
              }}
            >{opt.charAt(0).toUpperCase() + opt.slice(1)}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Privacy</Text>

      <View style={styles.card}>
        <OptionRow label="Last Seen" options={['everyone', 'contacts', 'nobody']}
          value={lastSeen} settingKey="lastSeen" />

        <OptionRow label="Profile Photo" options={['everyone', 'contacts', 'nobody']}
          value={profilePhoto} settingKey="profilePhotoVisibility" />

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>Read Receipts</Text>
            <Text style={styles.switchSubtitle}>Let others know when you&apos;ve read their messages</Text>
          </View>
          <Switch
            value={readReceipts}
            onValueChange={(val) => { setReadReceipts(val); updateSetting('readReceipts', val); }}
            trackColor={{ false: '#D1D5DB', true: colors.primary }}
            thumbColor="#fff"
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20 },
  header: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 20 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16 },
  optionGroup: { marginBottom: 24 },
  optionLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 10 },
  optionButtons: { flexDirection: 'row', gap: 8 },
  optionBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.background, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  optionBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionBtnText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  optionBtnTextActive: { color: '#fff' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 },
  switchLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  switchSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2, maxWidth: 240 },
});
