import '@/lib/background/background-location-task';
import '@/lib/background/background-notification-task';
import '../../global.css';

import { Stack } from 'expo-router';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider } from '@/lib/auth';
import { initializeFirebase } from '@/lib/firebase';
import { NotificationProvider } from '@/lib/notification/notification-provider';

// Initialize Firebase
initializeFirebase();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <NotificationProvider>
          <Stack screenOptions={{ headerShown: false, animation: 'none' }} />
        </NotificationProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
