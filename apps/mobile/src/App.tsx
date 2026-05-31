import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './navigation/RootNavigator';
import { StatusBar } from 'expo-status-bar';
import { SocketProvider } from './signal/SocketContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <SocketProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </SocketProvider>
    </SafeAreaProvider>
  );
}
