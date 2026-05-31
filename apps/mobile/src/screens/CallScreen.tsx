import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export default function CallScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Call</Text>
      <Text style={styles.subtext}>Call features coming soon...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  header: { fontSize: 28, fontWeight: '700', color: colors.text },
  subtext: { fontSize: 16, color: colors.textSecondary, marginTop: 10 },
});
