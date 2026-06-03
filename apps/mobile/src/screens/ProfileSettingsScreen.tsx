import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView,
} from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import { colors } from '../theme/colors';
import { API_BASE } from '../lib/api';

export default function ProfileSettingsScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE}/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsername(data.username || '');
        setDisplayName(data.displayName || '');
        setBio(data.bio || '');
      }
    } catch {}
  }

  async function saveProfile() {
    setSaving(true);
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE}/users/me`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, bio, username }),
      });
      if (res.ok) {
        Alert.alert('Success', 'Profile updated');
        navigation.goBack();
      } else {
        const err = await res.json();
        Alert.alert('Error', err.error || 'Failed to update');
      }
    } catch {
      Alert.alert('Error', 'Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Edit Profile</Text>

      <View style={styles.card}>
        <View style={styles.field}>
          <Text style={styles.label}>Username</Text>
          <TextInput style={styles.input} value={username} onChangeText={setUsername}
            placeholder="your_username" placeholderTextColor={colors.textSecondary} autoCapitalize="none" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Display Name</Text>
          <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName}
            placeholder="Your Name" placeholderTextColor={colors.textSecondary} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Bio</Text>
          <TextInput style={[styles.input, styles.textArea]} value={bio} onChangeText={setBio}
            placeholder="Tell others about yourself..." placeholderTextColor={colors.textSecondary}
            multiline numberOfLines={3} maxLength={500} />
          <Text style={styles.charCount}>{bio.length}/500</Text>
        </View>
      </View>

      <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={saveProfile} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20 },
  header: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 20 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16 },
  field: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.background, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: colors.textSecondary, textAlign: 'right', marginTop: 4 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
