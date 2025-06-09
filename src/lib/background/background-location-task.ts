import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { AUTH_STORAGE_KEY } from '@/lib/auth/constants';

import { type AuthData } from '../auth/types';

const BACKGROUND_LOCATION_TASK = 'background-location-task';
const API_URL = 'https://ws.trip-nus.com/driver';

type DriverData = {
  socketId?: string;
  role: 'driver';
  id: string;
  location: {
    lat: number | null;
    lng: number | null;
  };
  vehicle_type: 'motorcycle' | 'car' | 'unknown';
  vehicle_plate: string;
  status: 'available' | 'on_trip' | 'offline' | 'waiting';
  update_via: 'websocket' | 'api' | 'mobile_app';
  last_updated_at: string;
  speed_kph: number;
  heading_deg: number;
  battery_level: number;
  accuracy_m: number;
};

// Define the background task
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async () => {
  const authStateString = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
  const authState = JSON.parse(authStateString || '{}');
  const authData: AuthData = authState.data;

  const id = authData.driverId;
  const vehicleType = authData.driverVehicleType;
  const vehiclePlate = authData.driverVehiclePlateNumber;

  try {
    if (!id || !vehicleType || !vehiclePlate) {
      console.log('❌ Missing driver info for background task');
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    // Get current location
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    // Prepare driver data
    const data: DriverData = {
      socketId: 'Halo',
      role: 'driver',
      id: authData.driverId!,
      location: {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      },
      vehicle_type:
        (vehicleType.toLowerCase() as 'motorcycle' | 'car') || 'unknown',
      vehicle_plate: vehiclePlate || 'unknown',
      status: 'available',
      update_via: 'api',
      last_updated_at: new Date().toISOString(),
      speed_kph: (location.coords.speed || 0) * 3.6, // Convert m/s to km/h
      heading_deg: location.coords.heading || 0,
      battery_level: 100, // You might want to get actual battery level
      accuracy_m: location.coords.accuracy || 0,
    };

    // Send location update to API
    await axios.put(API_URL, data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(
      '📍 Background location sent:',
      data.location.lat,
      ',',
      data.location.lng
    );
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('❌ Background location task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});
