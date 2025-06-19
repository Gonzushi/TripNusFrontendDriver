import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as BackgroundFetch from 'expo-background-fetch';
import type * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { type AuthData } from '@/api/types/auth';
import { AUTH_STORAGE_KEY } from '@/constants';

import {
  API_URL,
  BACKGROUND_LOCATION_TASK,
  DEBUG_MODE,
  DISTANCE_UPDATE_INTERVAL_M,
  DRIVER_AVAILABILITY_STATUS_KEY,
  DRIVER_LOCATION_KEY,
  LOCATION_UPDATE_INTERVAL_MS,
  NEAR_DISTANCE_UPDATE_INTERVAL_M,
  NEAR_LOCATION_UPDATE_INTERVAL_MS,
  PICK_UP_LOCATION_KEY,
  SAVE_INTERVAL_MS,
} from './constants';
import { type AvailabilityStatus, type DriverData } from './types';
import { calculateDistance, debugLog } from './utils';

let lastUpdateTime = 0;
let lastSavedToStorageTime = 0;
let lastLocation: Location.LocationObject | null = null;
let cachedAuthData: {
  driverId: string;
  vehicleType: string;
  accessToken: string;
} | null = null;

// Save location to AsyncStorage with debounce
async function maybeSaveLocationToStorage(location: Location.LocationObject) {
  const now = Date.now();

  if (now - lastSavedToStorageTime < SAVE_INTERVAL_MS) {
    debugLog(DEBUG_MODE, '⏳ Skipping AsyncStorage save (debounced)');
    return;
  }

  lastSavedToStorageTime = now;

  const minimalLocation = {
    coords: {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      speed: location.coords.speed ?? 0,
      heading: location.coords.heading ?? 0,
      accuracy: location.coords.accuracy ?? 0,
    },
    timestamp: now,
  };

  try {
    await AsyncStorage.setItem(
      DRIVER_LOCATION_KEY,
      JSON.stringify(minimalLocation)
    );
    debugLog(DEBUG_MODE, '✅ Saved minimal location to AsyncStorage');
  } catch (error) {
    console.error('❌ Failed to save location to AsyncStorage:', error);
  }
}

// Load and cache auth data from AsyncStorage
async function getAuthData(): Promise<typeof cachedAuthData> {
  if (cachedAuthData) return cachedAuthData;

  try {
    const authStateString = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    const authState = JSON.parse(authStateString || '{}');
    const authData: AuthData = authState.data;
    if (
      !authData?.driverId ||
      !authData?.driverVehicleType ||
      !authData?.session?.access_token
    )
      return null;

    cachedAuthData = {
      driverId: authData.driverId,
      vehicleType: authData.driverVehicleType,
      accessToken: authData.session.access_token,
    };

    return cachedAuthData;
  } catch (error) {
    console.error('❌ Error getting auth data:', error);
    return null;
  }
}

// Determine if location update should be sent
export const shouldUpdate = async (
  location: Location.LocationObject
): Promise<boolean> => {
  const now = Date.now();
  const timeDiff = now - lastUpdateTime;
  if (!lastLocation) return true;

  let pickupProximityRelaxed = false;

  try {
    const statusRaw = await AsyncStorage.getItem(
      DRIVER_AVAILABILITY_STATUS_KEY
    );
    const availabilityStatus = statusRaw as AvailabilityStatus | null;

    if (
      availabilityStatus === 'en_route_to_pickup' ||
      availabilityStatus === 'waiting_at_pickup'
    ) {
      const pickupLocationJson =
        await AsyncStorage.getItem(PICK_UP_LOCATION_KEY);

      if (pickupLocationJson) {
        const pickupCoords = JSON.parse(pickupLocationJson);

        const distanceToPickup = calculateDistance(
          location.coords.latitude,
          location.coords.longitude,
          pickupCoords.latitude,
          pickupCoords.longitude
        );

        if (distanceToPickup <= NEAR_DISTANCE_UPDATE_INTERVAL_M) {
          debugLog(
            DEBUG_MODE,
            `📍 Near pickup: ${distanceToPickup.toFixed(2)}m`
          );
          pickupProximityRelaxed = true;
        }
      }
    }
  } catch (err) {
    console.warn('⚠️ Failed to check pickup proximity:', err);
  }

  const distance = calculateDistance(
    lastLocation.coords.latitude,
    lastLocation.coords.longitude,
    location.coords.latitude,
    location.coords.longitude
  );

  const effectiveTimeThreshold = pickupProximityRelaxed
    ? NEAR_LOCATION_UPDATE_INTERVAL_MS
    : LOCATION_UPDATE_INTERVAL_MS;

  if (distance >= DISTANCE_UPDATE_INTERVAL_M) {
    debugLog(DEBUG_MODE, `📍 Distance threshold met: ${distance.toFixed(2)}m`);
    return true;
  }
  if (timeDiff >= effectiveTimeThreshold) {
    debugLog(
      DEBUG_MODE,
      `⏱ Time threshold met: ${(timeDiff / 1000).toFixed(1)}s`
    );
    return true;
  }

  debugLog(
    DEBUG_MODE,
    `🔄 Skipping update - Distance: ${distance.toFixed(2)}m, Time: ${(timeDiff / 1000).toFixed(1)}s`
  );
  return false;
};

// Background task: send driver location update
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async (taskData) => {
  const { locations } = taskData.data as {
    locations: Location.LocationObject[];
  };
  if (!locations?.length) {
    console.log('❌ No location data received');
    return BackgroundFetch.BackgroundFetchResult.NoData;
  }

  const location = locations[0];

  if (!(await shouldUpdate(location)))
    return BackgroundFetch.BackgroundFetchResult.NoData;

  try {
    const authData = await getAuthData();

    if (!authData) {
      console.log('❌ Missing driver info for background task');
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    const statusRaw = await AsyncStorage.getItem(
      DRIVER_AVAILABILITY_STATUS_KEY
    );
    const availabilityStatus = (statusRaw as AvailabilityStatus) ?? 'available';

    const driverData: DriverData = {
      role: 'driver',
      availabilityStatus,
      id: authData.driverId,
      lat: location.coords.latitude,
      lng: location.coords.longitude,
      vehicle_type:
        (authData.vehicleType.toLowerCase() as 'motorcycle' | 'car') ||
        'unknown',
      update_via: 'api',
      last_updated_at: new Date().toISOString(),
      speed_kph: (location.coords.speed || 0) * 3.6,
      heading_deg: location.coords.heading || 0,
      accuracy_m: location.coords.accuracy || 0,
    };

    axios.put(API_URL, driverData, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authData.accessToken}`,
      },
    });

    lastUpdateTime = Date.now();
    lastLocation = location;

    await maybeSaveLocationToStorage(location);

    console.log(
      `📍 Location Background - Lat: ${driverData.lat?.toFixed(6)}, Lng: ${driverData.lng?.toFixed(6)}, Speed: ${driverData.speed_kph?.toFixed(1)} km/h, Heading: ${driverData.heading_deg?.toFixed(1)}°`
    );

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('❌ Background location task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});
