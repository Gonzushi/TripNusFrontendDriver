import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as BackgroundFetch from 'expo-background-fetch';
import type * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { AUTH_STORAGE_KEY } from '@/lib/auth/constants';

import { type AuthData } from '../auth/types';
import {
  API_URL,
  BACKGROUND_LOCATION_TASK,
  DEBUG_MODE,
  DISTANCE_UPDATE_INTERVAL,
  LOCATION_UPDATE_INTERVAL,
} from './constants';
import { type DriverData } from './types';
import { debugLog } from './utlis';


let lastUpdateTime = 0;
let lastLocation: Location.LocationObject | null = null;
let cachedAuthData: {
  driverId: string;
  vehicleType: string;
  vehiclePlate: string;
  accessToken: string;
} | null = null;

// Helper to calculate distance between two points in meters
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Get cached auth data or load from storage
async function getAuthData(): Promise<{
  driverId: string;
  vehicleType: string;
  vehiclePlate: string;
  accessToken: string;
} | null> {
  try {
    // Return cached data if available
    if (cachedAuthData) {
      return cachedAuthData;
    }

    // Load from storage if not cached
    const authStateString = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    const authState = JSON.parse(authStateString || '{}');
    const authData: AuthData = authState.data;

    if (
      !authData?.driverId ||
      !authData?.driverVehicleType ||
      !authData?.driverVehiclePlateNumber ||
      !authData?.session.access_token
    ) {
      return null;
    }

    // Cache the auth data
    cachedAuthData = {
      driverId: authData.driverId,
      vehicleType: authData.driverVehicleType,
      vehiclePlate: authData.driverVehiclePlateNumber,
      accessToken: authData.session.access_token,
    };

    return cachedAuthData;
  } catch (error) {
    console.error('❌ Error getting auth data:', error);
    return null;
  }
}

// Determine if we should send an update based on time and distance
const shouldUpdate = (location: Location.LocationObject): boolean => {
  const now = Date.now();
  const timeDiff = now - lastUpdateTime;

  // Always update if this is the first location
  if (!lastLocation) {
    return true;
  }

  // Calculate distance from last update
  const distance = calculateDistance(
    lastLocation.coords.latitude,
    lastLocation.coords.longitude,
    location.coords.latitude,
    location.coords.longitude
  );

  // Update if we've moved more than the distance threshold
  if (distance >= DISTANCE_UPDATE_INTERVAL) {
    debugLog(DEBUG_MODE, `📍 Distance threshold met: ${distance.toFixed(2)}m`);
    return true;
  }

  // Update if enough time has passed
  if (timeDiff >= LOCATION_UPDATE_INTERVAL) {
    debugLog(
      DEBUG_MODE,
      `⏱ Time threshold met: ${(timeDiff / 1000).toFixed(1)}s`
    );
    return true;
  }

  debugLog(
    DEBUG_MODE,
    `🔄 Skipping update - Distance: ${distance.toFixed(2)}m, Time: ${(
      timeDiff / 1000
    ).toFixed(1)}s`
  );
  return false;
};

// Define the background task for location updates
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async (taskData) => {
  const { locations } = taskData.data as {
    locations: Location.LocationObject[];
  };

  if (!locations || locations.length === 0) {
    console.log('❌ No location data received');
    return BackgroundFetch.BackgroundFetchResult.NoData;
  }

  // Get the location data passed directly from the task
  const location = locations[0];

  // Check if we should process this update
  if (!shouldUpdate(location)) {
    return BackgroundFetch.BackgroundFetchResult.NoData;
  }

  try {
    const authData = await getAuthData();
    if (!authData) {
      console.log('❌ Missing driver info for background task');
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    // Prepare driver data using the location passed to the task
    const driverData: DriverData = {
      role: 'driver',
      id: authData.driverId,
      lat: location.coords.latitude,
      lng: location.coords.longitude,
      vehicle_type:
        (authData.vehicleType.toLowerCase() as 'motorcycle' | 'car') ||
        'unknown',
      vehicle_plate: authData.vehiclePlate || 'unknown',
      status: 'available',
      update_via: 'api',
      last_updated_at: new Date().toISOString(),
      speed_kph: (location.coords.speed || 0) * 3.6, // Convert m/s to km/h
      heading_deg: location.coords.heading || 0,
      accuracy_m: location.coords.accuracy || 0,
    };

    // Send location update to API
    await axios.put(API_URL, driverData, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authData.accessToken}`,
      },
    });

    // Update our tracking variables after successful update
    lastUpdateTime = Date.now();
    lastLocation = location;

    console.log(
      `📍 Location Background - Lat: ${location.coords.latitude.toFixed(
        6
      )}, Lng: ${location.coords.longitude.toFixed(
        6
      )}, Speed: ${driverData?.speed_kph!.toFixed(
        1
      )} km/h, Heading: ${driverData?.heading_deg!.toFixed(1)}°`
    );

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('❌ Background location task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});
