// File: lib/notification/notification-provider.tsx

import type * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { AuthContext } from '../auth';
import { registerBackgroundNotificationTask } from '../background/background-notification-task';
import { updateDriverProfileApi } from '../driver';
import NotificationHandler from '../notification-handler';
import { type NotificationData } from '../notification-handler/types';
import {
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  registerForPushNotificationsAsync,
} from './notifications';

type NotificationContextValue = {
  expoPushToken: string | null;
  lastNotificationResponse: Notifications.NotificationResponse | null;
  lastNotification: Notifications.Notification | null;
  error: string | null;
  notification: Notifications.Notification | null;
  setExpoPushToken: (token: string | null) => void;
  setNotification: (notification: Notifications.Notification | null) => void;
};

const NotificationContext = createContext<NotificationContextValue>({
  expoPushToken: null,
  lastNotificationResponse: null,
  lastNotification: null,
  error: null,
  notification: null,
  setExpoPushToken: () => {},
  setNotification: () => {},
});

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { authData } = useContext(AuthContext);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [lastNotificationResponse, setLastNotificationResponse] =
    useState<Notifications.NotificationResponse | null>(null);
  const [lastNotification, setLastNotification] =
    useState<Notifications.Notification | null>(null);
  const [notification, setNotification] =
    useState<Notifications.Notification | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const setupNotifications = async () => {
      try {
        // Register background task
        await registerBackgroundNotificationTask();

        // Register for push notifications
        const token = await registerForPushNotificationsAsync();
        if (token && isMounted) {
          setExpoPushToken(token);
          if (authData?.session.access_token) {
            await updateDriverProfileApi(authData.session.access_token, {
              push_token: token,
            });
          }
        }
      } catch (err) {
        console.error('Error setting up notifications:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    };

    // Handle app state changes
    const subscription = AppState.addEventListener(
      'change',
      async (nextAppState) => {
        if (nextAppState === 'active') {
          await registerBackgroundNotificationTask();
        } else if (nextAppState === 'background') {
        }
      }
    );

    const receivedSubscription = addNotificationReceivedListener(
      (notification) => {
        if (isMounted) {
          setLastNotification(notification);
          try {
            const data = notification.request.content.data as NotificationData;
            NotificationHandler(data, router);
          } catch (err) {
            console.error('Error parsing notification data:', err);
          }
        }
      }
    );

    const responseSubscription = addNotificationResponseReceivedListener(
      (response) => {
        if (isMounted) {
          setLastNotificationResponse(response);
          try {
            const data = response.notification.request.content
              .data as NotificationData;
            NotificationHandler(data, router);
          } catch (err) {
            console.error('Error parsing notification data:', err);
          }
        }
      }
    );

    setupNotifications();

    return () => {
      isMounted = false;
      subscription.remove();
      receivedSubscription.remove();
      responseSubscription.remove();
      // Don't unregister the task on unmount as it needs to stay registered
    };
  }, [authData?.session.access_token]);

  return (
    <NotificationContext.Provider
      value={{
        expoPushToken,
        lastNotificationResponse,
        lastNotification,
        error,
        notification,
        setExpoPushToken,
        setNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      'useNotification must be used within a NotificationProvider'
    );
  }
  return context;
};
