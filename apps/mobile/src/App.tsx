import React from 'react';
import { AppState, View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './navigation/RootNavigator';
import { StatusBar } from 'expo-status-bar';
import { SocketProvider } from './signal/SocketContext';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { NotoSerif_700Bold, NotoSerif_900Black } from '@expo-google-fonts/noto-serif';
import { PublicSans_500Medium, PublicSans_700Bold } from '@expo-google-fonts/public-sans';

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
        <RootNavigator />
        {isBackground && (
          <View style={[StyleSheet.absoluteFill, styles.shield]}>
            <Text style={styles.shieldText}>GUFF</Text>
            <Text style={styles.shieldSub}>Locked for privacy</Text>
          </View>
        )}
      </SocketProvider>
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
  }
});
