import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EncryptedStorage from 'react-native-encrypted-storage';
import { colors } from '../theme/colors';

export default function AccountScreen({ navigation }: any) {
  async function handleLogout() {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userId']);
          await EncryptedStorage.clear();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  }

  async function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'Your account and all data will be scheduled for deletion in 30 days. This action can be cancelled by logging in again within that period.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('accessToken');
              const apiBase = 'http://localhost:4000/api'; // TODO: from config
              await fetch(`${apiBase}/users/me`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
              });
              await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userId']);
              await EncryptedStorage.clear();
              navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            } catch {
              Alert.alert('Error', 'Failed to delete account. Try again.');
            }
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Account</Text>

      <View style={styles.card}>
        <TouchableOpacity style={styles.row}>
          <Text style={styles.rowLabel}>Change Phone Number</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rowBorder} />
        <TouchableOpacity style={styles.row} onPress={handleLogout}>
          <Text style={[styles.rowLabel, styles.dangerText]}>Log Out</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rowBorder} />
        <TouchableOpacity style={styles.row} onPress={handleDeleteAccount}>
          <Text style={[styles.rowLabel, styles.dangerText]}>Delete Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20 },
  header: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: 24 },
  card: { backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' },
  row: { padding: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { fontSize: 16, fontWeight: '500', color: colors.text },
  dangerText: { color: '#EF4444' },
});
