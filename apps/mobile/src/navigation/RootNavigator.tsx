import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import ChatScreen from '../screens/ChatScreen';
import LoginScreen from '../screens/LoginScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ProfileSettingsScreen from '../screens/ProfileSettingsScreen';
import PrivacySettingsScreen from '../screens/PrivacySettingsScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import AccountScreen from '../screens/AccountScreen';
import CallScreen from '../screens/CallScreen';
import ExploreScreen from '../screens/ExploreScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { colors } from '../theme/colors';

import NotificationsScreen from '../screens/NotificationsScreen';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Explore: undefined;
  Notifications: undefined;
  Messages: undefined;
  Profile: undefined;
  Chat: { id: string; name: string };
  Settings: undefined;
  ProfileSettings: undefined;
  PrivacySettings: undefined;
  NotificationSettings: undefined;
  Account: undefined;
  Call: { id: string; name: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

import { useSocket } from '../signal/SocketContext';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const IncomingCallOverlay = () => {
  const { socket } = useSocket();
  const navigation = useNavigation<any>();
  const [incomingCall, setIncomingCall] = React.useState<any>(null);

  React.useEffect(() => {
    if (!socket) return;
    
    const handleOffer = (payload: any) => {
      setIncomingCall(payload);
    };

    const handleEnd = () => {
      setIncomingCall(null);
    };

    socket.on('webrtc-offer', handleOffer);
    socket.on('call-end', handleEnd);

    return () => {
      socket.off('webrtc-offer', handleOffer);
      socket.off('call-end', handleEnd);
    };
  }, [socket]);

  if (!incomingCall) return null;

  return (
    <Modal transparent visible animationType="fade">
      <View style={overlayStyles.container}>
        <View style={overlayStyles.card}>
          <Text style={overlayStyles.title}>Incoming Video Call</Text>
          <Text style={overlayStyles.subtitle}>Someone is calling you</Text>
          
          <View style={overlayStyles.actions}>
            <TouchableOpacity 
              style={[overlayStyles.btn, overlayStyles.reject]} 
              onPress={() => {
                socket?.emit('call-end', { targetUserId: incomingCall.senderId });
                setIncomingCall(null);
              }}
            >
              <Text style={overlayStyles.btnText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[overlayStyles.btn, overlayStyles.accept]} 
              onPress={() => {
                const callPayload = incomingCall;
                setIncomingCall(null);
                navigation.navigate('Call', { 
                  id: callPayload.senderId, 
                  name: 'Caller', 
                  isIncoming: true, 
                  offerPayload: callPayload 
                });
              }}
            >
              <Text style={overlayStyles.btnText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const overlayStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#18181b', padding: 24, borderRadius: 16, width: 300, alignItems: 'center' },
  title: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  subtitle: { color: '#a1a1aa', fontSize: 14, marginTop: 8, marginBottom: 24 },
  actions: { flexDirection: 'row', gap: 16 },
  btn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  reject: { backgroundColor: '#ef4444' },
  accept: { backgroundColor: '#22c55e' },
  btnText: { color: '#fff', fontWeight: '600' }
});

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Login"
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.onSurface,
          headerShadowVisible: false,
          headerBackTitleVisible: false,
        }}
      >
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="Explore" 
          component={ExploreScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="Notifications" 
          component={NotificationsScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="Messages" 
          component={MessagesScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="Profile" 
          component={ProfileScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="Chat" 
          component={ChatScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen} 
          options={{ title: 'Settings' }} 
        />
        <Stack.Screen 
          name="ProfileSettings" 
          component={ProfileSettingsScreen} 
          options={{ title: 'Edit Profile' }} 
        />
        <Stack.Screen 
          name="PrivacySettings" 
          component={PrivacySettingsScreen} 
          options={{ title: 'Privacy' }} 
        />
        <Stack.Screen 
          name="NotificationSettings" 
          component={NotificationSettingsScreen} 
          options={{ title: 'Notifications' }} 
        />
        <Stack.Screen 
          name="Account" 
          component={AccountScreen} 
          options={{ title: 'Account' }} 
        />
        <Stack.Screen 
          name="Call" 
          component={CallScreen} 
          options={{ title: 'Call' }} 
        />
      </Stack.Navigator>
      <IncomingCallOverlay />
    </NavigationContainer>
  );
}
