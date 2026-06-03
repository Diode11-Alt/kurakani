import React from 'react';
import { AppState, View, Text, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import RootNavigator from './navigation/RootNavigator';
import { StatusBar } from 'expo-status-bar';
import { SocketProvider } from './signal/SocketContext';
import { API_BASE } from './lib/api';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { NotoSerif_700Bold, NotoSerif_900Black } from '@expo-google-fonts/noto-serif';
import { PublicSans_500Medium, PublicSans_700Bold } from '@expo-google-fonts/public-sans';
import Toast from 'react-native-toast-message';
import { useNetInfo } from '@react-native-community/netinfo';
import { WifiOff } from 'lucide-react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import EncryptedStorage from 'react-native-encrypted-storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }
    token = (await Notifications.getDevicePushTokenAsync()).data;
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

const OfflineBanner = () => {
  const netInfo = useNetInfo();
  const insets = useSafeAreaInsets();

  if (netInfo.isConnected !== false) return null;

  return (
    <View style={[styles.offlineBanner, { paddingTop: insets.top }]}>
      <WifiOff size={16} color="#fff" />
      <Text style={styles.offlineText}>No Internet Connection</Text>
    </View>
  );
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    NotoSerif_700Bold,
    NotoSerif_900Black,
    PublicSans_500Medium,
    PublicSans_700Bold,
  });

  const [appState, setAppState] = React.useState(AppState.currentState);

  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      setAppState(nextAppState);
    });

    // Register push token
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        EncryptedStorage.getItem('signal_token').then(jwt => {
          if (jwt) {
            fetch(`${API_BASE}/users/push-token`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwt}`
              },
              body: JSON.stringify({
                pushToken: token,
                platform: Platform.OS,
                deviceId: Device.osBuildId || 'unknown_mobile_device'
              })
            }).catch(console.error);
          }
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  const isBackground = appState === 'background' || appState === 'inactive';

  return (
    <SafeAreaProvider>
      <SocketProvider>
        <StatusBar style="dark" />
        <OfflineBanner />
        <RootNavigator />
        {isBackground && (
          <View style={[StyleSheet.absoluteFill, styles.shield]}>
            <Text style={styles.shieldText}>GUFF</Text>
            <Text style={styles.shieldSub}>Locked for privacy</Text>
          </View>
        )}
      </SocketProvider>
      <Toast />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  shield: {
    backgroundColor: '#09090b', // Zinc 950
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999999,
  },
  shieldText: {
    color: '#e0e7ff',
    fontSize: 48,
    fontFamily: 'NotoSerif_900Black',
    letterSpacing: -1,
  },
  shieldSub: {
    color: '#818cf8',
    fontSize: 14,
    fontFamily: 'PublicSans_500Medium',
    marginTop: 8,
  },
  offlineBanner: {
    backgroundColor: '#ef4444',
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 9999,
  },
  offlineText: {
    color: '#fff',
    fontFamily: 'PublicSans_500Medium',
    fontSize: 14,
  }
});
