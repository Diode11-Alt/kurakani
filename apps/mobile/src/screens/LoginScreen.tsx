import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSocket } from '../signal/SocketContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { SignalProtocolStore } from '../signal/SignalStore';
import { KeyHelper } from '@privacyresearch/libsignal-protocol-typescript';
import { bufferToBase64 } from '../signal/utils';
import { colors } from '../theme/colors';

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
      let body: any = { phone, username };

      if (mode === 'register') {
        // Generate Signal Protocol Keys
        const registrationId = KeyHelper.generateRegistrationId();
        const identityKeyPair = await KeyHelper.generateIdentityKeyPair();
        const preKey = await KeyHelper.generatePreKey(1);
        const signedPreKey = await KeyHelper.generateSignedPreKey(identityKeyPair, 1);

        // Store keys locally
        const store = new SignalProtocolStore();
        await AsyncStorage.setItem('keys:localRegistrationId', registrationId.toString());
        await AsyncStorage.setItem('keys:localIdentity', JSON.stringify({
          pubKey: { __type: 'ArrayBuffer', data: bufferToBase64(identityKeyPair.pubKey) },
          privKey: { __type: 'ArrayBuffer', data: bufferToBase64(identityKeyPair.privKey) }
        }));
        await store.storePreKey(1, preKey.keyPair);
        await store.storeSignedPreKey(1, signedPreKey.keyPair);

        body = {
          ...body,
          registrationId,
          identityKey: bufferToBase64(identityKeyPair.pubKey),
          signedPreKey: {
            keyId: signedPreKey.keyId,
            publicKey: bufferToBase64(signedPreKey.keyPair.pubKey),
            signature: bufferToBase64(signedPreKey.signature)
          },
          preKeys: [{
            keyId: preKey.keyId,
            publicKey: bufferToBase64(preKey.keyPair.pubKey)
          }]
        };
      }

      const res = await fetch(`http://localhost:4000/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Authentication failed');
      }

      const { token, user } = await res.json();
      await AsyncStorage.setItem('signal_token', token);
      await AsyncStorage.setItem('signal_user', JSON.stringify(user));
      
      connect(); // Connect websocket
      navigation.replace('Home');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>G</Text>
        </View>
        <Text style={styles.title}>GUFF</Text>
        <Text style={styles.subtitle}>Enter your details to log in or register</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={[styles.input, isPhoneFocused && styles.inputFocused]}
          placeholder="Phone number"
          placeholderTextColor={colors.textSecondary}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoCapitalize="none"
          onFocus={() => setIsPhoneFocused(true)}
          onBlur={() => setIsPhoneFocused(false)}
        />
        <TextInput
          style={[styles.input, isUserFocused && styles.inputFocused]}
          placeholder="Username"
          placeholderTextColor={colors.textSecondary}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          onFocus={() => setIsUserFocused(true)}
          onBlur={() => setIsUserFocused(false)}
        />

        <TouchableOpacity 
          style={styles.button} 
          onPress={() => handleAuth('login')}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Log In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]} 
          onPress={() => handleAuth('register')}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Create New Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  iconText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 6,
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 28,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  button: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
    shadowOpacity: 0,
    elevation: 0,
    marginTop: 12,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: colors.error,
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  }
});
