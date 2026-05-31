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

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Explore: undefined;
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
    </NavigationContainer>
  );
}
