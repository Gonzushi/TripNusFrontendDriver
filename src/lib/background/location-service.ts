import * as Location from 'expo-location';

import {
  BACKGROUND_LOCATION_TASK,
  DISTANCE_UPDATE_INTERVAL,
  LOCATION_UPDATE_INTERVAL,
} from './constants';

// Request location permissions from the user
export async function requestPermissions(): Promise<boolean> {
  try {
    const { status: foregroundStatus } =
      await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      console.log('❌ Permission to access location was denied');
      return false;
    }

    const { status: backgroundStatus } =
      await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.log('❌ Permission to access location in background was denied');
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Error requesting location permissions:', error);
    return false;
  }
}

// Start background location updates
export async function startBackgroundUpdates(): Promise<boolean> {
  try {
    // Request permissions
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return false;

    // Check if the tasks are already running
    const hasLocationStarted = await Location.hasStartedLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK
    ).catch(() => false);

    // Start location updates if not running
    if (!hasLocationStarted) {
      // Start location updates with optimized settings
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        // Use high accuracy when app is in foreground, balanced in background
        accuracy: Location.Accuracy.Balanced,

        // Time and distance intervals
        timeInterval: LOCATION_UPDATE_INTERVAL,
        distanceInterval: DISTANCE_UPDATE_INTERVAL,

        // Optimize for battery life
        activityType: Location.ActivityType.AutomotiveNavigation,
        showsBackgroundLocationIndicator: true,

        // Defer updates slightly to batch them - iOS only
        deferredUpdatesInterval: LOCATION_UPDATE_INTERVAL,
        deferredUpdatesDistance: DISTANCE_UPDATE_INTERVAL,

        // Prevent unnecessary app state changes
        pausesUpdatesAutomatically: false,

        foregroundService: {
          notificationTitle: 'Pembaruan Lokasi',
          notificationBody: 'Melacak lokasi pengemudi di latar belakang',
          notificationColor: '#2563eb', // Blue color for visibility
        },
      });

      console.log('✅ Background location task started');
    } else {
      console.log('✅ Background location task is already running');
    }

    return true;
  } catch (error) {
    console.error('❌ Error starting background updates:', error);
    return false;
  }
}

// Stop background location updates
export async function stopBackgroundUpdates(): Promise<void> {
  try {
    // Check if the task exists before trying to stop it
    const hasLocationStarted = await Location.hasStartedLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK
    ).catch(() => false);

    if (hasLocationStarted) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      console.log('❌ Background location task stopped');
    } else {
      console.log('✅ Background location task was already stopped');
    }
  } catch (error) {
    // Check if this is a task-not-found error, which we can safely ignore
    const errorMessage = String(error);
    if (
      errorMessage.includes('TaskNotFoundException') ||
      errorMessage.includes('Task not found')
    ) {
      console.log('✅ Background location task was already stopped');
    } else {
      console.error('❌ Error stopping background updates:', error);
    }
  }
}
