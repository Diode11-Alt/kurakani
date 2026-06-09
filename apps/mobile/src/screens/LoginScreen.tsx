import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, Platform } from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import { useSocket } from '../signal/SocketContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { SignalProtocolStore } from '../signal/SignalStore';
import { KeyHelper } from '@privacyresearch/libsignal-protocol-typescript';
import { bufferToBase64 } from '../signal/utils';
import { supabase } from '../lib/supabase';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Phone, User, ArrowRight, ShieldCheck } from 'lucide-react-native';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

export default function LoginScreen({ navigation }: Props) {
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);
  const [isUserFocused, setIsUserFocused] = useState(false);
  const { connect } = useSocket();

  const handleAuth = async (mode: 'login' | 'register') => {
    if (!phone || !username) {
      setError('Please fill in both fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let body: Record<string, unknown> = { phone, username };

      if (mode === 'register') {
        const registrationId = KeyHelper.generateRegistrationId();
        const identityKeyPair = await KeyHelper.generateIdentityKeyPair();
        const preKey = await KeyHelper.generatePreKey(1);
        const signedPreKey = await KeyHelper.generateSignedPreKey(identityKeyPair, 1);

        const store = new SignalProtocolStore();
        await EncryptedStorage.setItem('keys:localRegistrationId', registrationId.toString());
        await EncryptedStorage.setItem('keys:localIdentity', JSON.stringify({
          pubKey: { __type: 'ArrayBuffer', data: bufferToBase64(identityKeyPair.pubKey) },
          privKey: { __type: 'ArrayBuffer', data: bufferToBase64(identityKeyPair.privKey) }
        }));
        await store.storePreKey(1, preKey.keyPair);
        await store.storeSignedPreKey(1, signedPreKey.keyPair);

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: `${username}@example.com`,
          password: phone, // using phone as password for MVP
          options: {
            data: {
              username,
              phone_number: phone,
              registration_id: registrationId,
            }
          }
        });
        
        if (authError) throw new Error(authError.message);
        if (!authData.user) throw new Error('Registration failed');
        
        const currentDeviceId = 1;
        
        await supabase.from('identity_keys').insert({
          user_id: authData.user.id,
          device_id: currentDeviceId,
          identity_key: bufferToBase64(identityKeyPair.pubKey)
        });
        await supabase.from('signed_pre_keys').insert({
          user_id: authData.user.id,
          device_id: currentDeviceId,
          key_id: signedPreKey.keyId,
          public_key: bufferToBase64(signedPreKey.keyPair.pubKey),
          signature: bufferToBase64(signedPreKey.signature)
        });
        await supabase.from('one_time_pre_keys').insert([{
          user_id: authData.user.id,
          device_id: currentDeviceId,
          key_id: preKey.keyId,
          public_key: bufferToBase64(preKey.keyPair.pubKey),
          used: false
        }]);

        await EncryptedStorage.setItem('signal_user', JSON.stringify(authData.user));
      } else {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: `${username}@example.com`,
          password: phone,
        });
        if (authError) throw new Error(authError.message);
        await EncryptedStorage.setItem('signal_user', JSON.stringify(authData.user));
      }
      
      connect();
      navigation.replace('Home');
    } catch (err: unknown) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue your session.</Text>
        </View>

        <View style={styles.card}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputContainer}>
              <Phone size={20} color={colors.outline} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isPhoneFocused && styles.inputFocused]}
                placeholder="+1 234 567 8900"
                placeholderTextColor={colors.outline}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoCapitalize="none"
                onFocus={() => setIsPhoneFocused(true)}
                onBlur={() => setIsPhoneFocused(false)}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Username</Text>
            </View>
            <View style={styles.inputContainer}>
              <User size={20} color={colors.outline} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isUserFocused && styles.inputFocused]}
                placeholder="julian_vance"
                placeholderTextColor={colors.outline}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                onFocus={() => setIsUserFocused(true)}
                onBlur={() => setIsUserFocused(false)}
              />
            </View>
          </View>

          <TouchableOpacity 
            style={styles.button} 
            onPress={() => handleAuth('login')}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <>
                <Text style={styles.buttonText}>Sign In</Text>
                <ArrowRight size={18} color={colors.onPrimary} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]} 
            onPress={() => handleAuth('register')}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <ShieldCheck size={20} color={colors.tertiary} />
          <Text style={styles.footerText}>ENTERPRISE PROTECTED</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 48,
    alignItems: 'center',
  },
  title: {
    fontFamily: typography.fonts.headline,
    fontSize: 36,
    color: colors.onSurface,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: typography.fonts.body,
    fontSize: 18,
    color: colors.onSurfaceVariant,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.glassBackground,
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
  },
  inputGroup: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontFamily: typography.fonts.labelBold,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginBottom: 8,
  },
  inputContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  input: {
    fontFamily: typography.fonts.body,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 12,
    paddingVertical: 14,
    paddingRight: 16,
    paddingLeft: 40,
    fontSize: 16,
    color: colors.onSurface,
  },
  inputFocused: {
    borderColor: colors.primary,
    borderWidth: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  button: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonText: {
    fontFamily: typography.fonts.labelBold,
    color: colors.onPrimary,
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
    marginTop: 8,
  },
  secondaryButtonText: {
    fontFamily: typography.fonts.labelBold,
    color: colors.primary,
    fontSize: 14,
  },
  error: {
    fontFamily: typography.fonts.bodyMedium,
    color: colors.error,
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 14,
  },
  footer: {
    marginTop: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerText: {
    fontFamily: typography.fonts.labelBold,
    fontSize: 14,
    color: colors.tertiary,
    letterSpacing: 1,
  },
});
