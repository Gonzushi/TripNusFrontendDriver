import * as Location from 'expo-location';

const BACKGROUND_LOCATION_TASK = 'background-location-task';
const LOCATION_UPDATE_INTERVAL = 5 * 1000; // 1 minute in milliseconds

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

    // Check if the task is already running
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK
    ).catch(() => false);

    if (hasStarted) {
      console.log('✅ Background location task is already running');
      return true;
    }

    // Start location updates
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: LOCATION_UPDATE_INTERVAL,
      foregroundService: {
        notificationTitle: 'Pembaruan Lokasi',
        notificationBody: 'Melacak lokasi pengemudi di latar belakang',
      },
    });

    console.log('✅ Background location task started');
    return true;
  } catch (error) {
    console.error('❌ Error starting background updates:', error);
    return false;
  }
}

// Stop background location updates
export async function stopBackgroundUpdates(): Promise<void> {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK
    ).catch(() => false);

    if (hasStarted) {
      // Unregister the task
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      console.log('✅ Background location task stopped');
    }
  } catch (error) {
    console.error('❌ Error stopping background updates:', error);
  }
}
