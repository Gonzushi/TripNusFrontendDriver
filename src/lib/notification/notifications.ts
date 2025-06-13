import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import Env from '@/lib/env';

const EAS_PROJECT_ID = Env.EAS_PROJECT_ID;

// Define the background notification task handler
Notifications.registerTaskAsync(
  'expo.notifications.BACKGROUND_NOTIFICATION_TASK'
);

// Configure how notifications should be presented when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),

  handleSuccess: async (notificationId) => {
    console.log(
      'Background notification handled successfully:',
      notificationId
    );
  },

  handleError: async (notificationId, error) => {
    console.error(
      'Error handling background notification:',
      notificationId,
      error
    );
  },
});

export async function registerForPushNotificationsAsync() {
  let token;
  console.log('Starting push notification registration...');

  try {
    if (Platform.OS === 'android') {
      console.log('Setting up Android notification channel...');
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
      console.log('Android notification channel set up successfully');
    }

    if (Device.isDevice) {
      console.log('Checking notification permissions...');
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      console.log('Current permission status:', existingStatus);

      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        console.log('Requesting notification permissions...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('Permission request result:', status);
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token: Permission denied');
        return null;
      }

      console.log('Getting Expo push token...');
      token = await Notifications.getExpoPushTokenAsync({
        projectId: EAS_PROJECT_ID,
      });

      console.log('Successfully got push token:', token);
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    return token ? token.data : null;
  } catch (error) {
    console.error('Error in registerForPushNotificationsAsync:', error);
    return null;
  }
}

// Function to handle received notifications
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}

// Function to handle notification responses (when user taps the notification)
export function addNotificationResponseReceivedListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}
