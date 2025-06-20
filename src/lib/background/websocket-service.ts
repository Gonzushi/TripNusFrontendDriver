import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';

import { type AvailabilityStatus } from '@/api/types/driver';

import NotificationHandler from '../notification-handler';
import {
  DRIVER_AVAILABILITY_STATUS_KEY,
  DRIVER_LOCATION_KEY,
  INTERNAL_SOCKET_EVENTS,
  MAX_CACHE_AGE_MS,
} from './constants';
import { type DriverData } from './types';
import { debugLog } from './utils';

// Constants
const DEBUG_MODE = false;
const WEBSOCKET_URL = 'wss://ws.trip-nus.com';
// const WEBSOCKET_URL = 'http://localhost:3001';
// const WEBSOCKET_URL = 'http://192.168.100.248:3001'

class WebSocketServiceClass {
  private socket: Socket | null = null;
  private currentLocation: Location.LocationObject | null = null;
  private isConnecting = false;
  private hasSetupListeners = false;
  private lastRegisterAt: number = 0;
  private driverId: string | null = null;
  private driverVehicleType: string | null = null;

  private async getAvailabilityStatus(): Promise<AvailabilityStatus | null> {
    try {
      const status = await AsyncStorage.getItem(DRIVER_AVAILABILITY_STATUS_KEY);
      return status as AvailabilityStatus;
    } catch (error) {
      console.warn('Failed to get availability status:', error);
      return null;
    }
  }

  constructor() {
    this.socket = null;
    this.driverId = null;
    this.driverVehicleType = null;
  }

  // Save current location to AsyncStorage
  private async saveCurrentLocation() {
    if (!this.currentLocation) return;

    try {
      const minimalLocation = {
        coords: {
          latitude: this.currentLocation.coords.latitude,
          longitude: this.currentLocation.coords.longitude,
          speed: this.currentLocation.coords.speed ?? 0,
          heading: this.currentLocation.coords.heading ?? 0,
          accuracy: this.currentLocation.coords.accuracy ?? 0,
        },
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(
        DRIVER_LOCATION_KEY,
        JSON.stringify(minimalLocation)
      );
    } catch (error) {
      console.warn('⚠️ Failed to save location to storage:', error);
    }
  }

  // Load last known location from AsyncStorage
  private async loadCachedLocation(): Promise<Location.LocationObject | null> {
    try {
      const json = await AsyncStorage.getItem(DRIVER_LOCATION_KEY);
      if (json) {
        const parsed = JSON.parse(json);
        if (
          parsed?.coords &&
          typeof parsed.coords.latitude === 'number' &&
          typeof parsed.coords.longitude === 'number' &&
          parsed.timestamp
        ) {
          return parsed as Location.LocationObject;
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load location from storage:', error);
    }
    return null;
  }

  // Use cached location if recent, otherwise fetch new location
  private async loadOrFetchLocation() {
    const cached = await this.loadCachedLocation();

    if (cached && cached.timestamp) {
      const age = Date.now() - new Date(cached.timestamp).getTime();
      if (age < MAX_CACHE_AGE_MS) {
        this.currentLocation = cached;
        return;
      }
    }

    // If cache is missing or stale
    await this.getCurrentLocation();
  }

  // Request foreground and background location permissions
  async requestLocationPermission(): Promise<boolean> {
    try {
      const { status: foregroundStatus } =
        await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        console.log('Permission to access location was denied');
        return false;
      }

      const { status: backgroundStatus } =
        await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        console.log('Permission to access location in background was denied');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  // Log all events for debugging
  private async watchAllSocketEvents(socket: Socket) {
    // Custom and dynamic events
    socket.onAny((event, ...args) => {
      console.log(`📥 [socket:onAny] ${event} |`, ...args);
    });

    // Internal events that don't go through onAny
    for (const event of INTERNAL_SOCKET_EVENTS) {
      socket.on(event, (...args) => {
        console.log(`⚙️  [socket:internal] ${event} |`, ...args);
      });
    }
  }

  // Connect to socket server
  async connect(driverId: string, driverVehicleType: string): Promise<void> {
    if (this.isConnecting) {
      console.log(
        '⚠️ WebSocket is currently connecting. Ignoring duplicate call.'
      );
      return;
    }

    this.isConnecting = true;

    try {
      if (
        this.socket?.connected &&
        this.driverId === driverId &&
        this.driverVehicleType === driverVehicleType
      ) {
        console.log(
          `✅ Websocket already connected with same driver info, connection: ${this.socket.id}`
        );
        await this.loadOrFetchLocation();
        await this.sendLocationUpdate();
        return;
      }

      if (this.socket?.connected) {
        console.log('🔄 Disconnecting existing connection before reconnecting');
        await this.disconnect();
      }

      const hasPermission = await this.requestLocationPermission();
      if (!hasPermission) {
        console.error('❌ Location permission denied');
        return;
      }

      this.driverId = driverId;
      this.driverVehicleType = driverVehicleType;

      return await new Promise<void>((resolve, reject) => {
        this.socket = io(WEBSOCKET_URL, {
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 2000,
        });

        this.socket.once('connect', async () => {
          // Clean up ghost socket from hot reload
          if (globalThis.__TRIPNUS_SOCKET__?.id !== this.socket?.id) {
            globalThis.__TRIPNUS_SOCKET__?.disconnect?.();
          }
          globalThis.__TRIPNUS_SOCKET__ = this.socket;

          console.log(
            '✅ Websocket Connected to server with ID:',
            this.socket?.id
          );

          try {
            await this.getCurrentLocation();
            await this.registerDriver();
            resolve();
          } catch (error) {
            console.error('❌ Error during websocket setup:', error);
            reject(error);
          } finally {
            this.isConnecting = false;
          }
        });

        this.socket.once('connect_error', (err: Error) => {
          console.error('⚠️ Connection error:', err.message);
          this.isConnecting = false;
          reject(err);
        });

        this.hasSetupListeners = false;
        this.setupEventListeners();
        if (DEBUG_MODE) this.watchAllSocketEvents(this.socket!);
      });
    } catch (error) {
      console.error('❌ Unhandled error during connect:', error);
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  // Set up event listeners for incoming socket messages and reconnections
  private setupEventListeners() {
    if (!this.socket || this.hasSetupListeners) return;
    this.hasSetupListeners = true;

    this.socket.on('message', async (data) => {
      debugLog(DEBUG_MODE, '📩 Server:', data);
      await NotificationHandler(data, router);
    });

    this.socket.io.on('reconnect', async () => {
      console.log('🔄 Reconnected to server');
      try {
        await this.loadOrFetchLocation();
        await this.registerDriver();
      } catch (error) {
        console.error('❌ Failed to re-register after reconnect:', error);
      }
    });

    this.socket.io.on('reconnect_failed', () => {
      console.warn(
        '⚠️ Socket temporarily unable to reconnect. Will keep trying.'
      );
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Websocket is disconnected due to:', reason);
    });

    this.socket.on('connect_error', (err: Error) => {
      console.error('⚠️ Connection error (repeat):', err.message);
    });
  }

  // Fetch current GPS location
  private async getCurrentLocation() {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    this.currentLocation = location;
    await this.saveCurrentLocation();
  }

  // Build driver data payload for register/update
  private async createDriverData(): Promise<DriverData> {
    if (!this.driverId || !this.currentLocation)
      throw new Error('Missing driver data');

    const availabilityStatus = await this.getAvailabilityStatus();

    return {
      role: 'driver',
      availabilityStatus: availabilityStatus || 'available',
      id: this.driverId,
      lat: this.currentLocation.coords.latitude,
      lng: this.currentLocation.coords.longitude,
      vehicle_type:
        (this.driverVehicleType?.toLowerCase() as 'motorcycle' | 'car') ||
        'unknown',
      update_via: 'websocket',
      last_updated_at: new Date().toISOString(),
      speed_kph: (this.currentLocation.coords.speed || 0) * 3.6,
      heading_deg: this.currentLocation.coords.heading || 0,
      accuracy_m: this.currentLocation.coords.accuracy || 0,
    };
  }

  // Emit driver registration event
  private async registerDriver() {
    if (!this.socket || !this.driverId || !this.currentLocation) return;

    const now = Date.now();
    if (now - this.lastRegisterAt < 3000) return;
    this.lastRegisterAt = now;

    try {
      const data = await this.createDriverData();

      this.socket.emit('register', data, async (res: { success: boolean }) => {
        if (res.success) {
          await this.sendLocationUpdate();
        } else {
          console.error('❌ Registration failed on server.');
        }
      });
    } catch (error) {
      console.error('Failed to register driver:', error);
    }
  }

  // Emit location update to server
  async sendLocationUpdate() {
    if (!this.socket || !this.driverId || !this.currentLocation) return;

    try {
      const data = await this.createDriverData();
      this.socket.emit('driver:updateLocation', data);
      console.log(
        `📍 Location Websocket - Lat: ${this.currentLocation.coords.latitude.toFixed(
          6
        )}, Lng: ${this.currentLocation.coords.longitude.toFixed(6)}, Speed: ${(
          (this.currentLocation.coords.speed || 0) * 3.6
        ).toFixed(
          1
        )} km/h, Heading: ${(this.currentLocation.coords.heading || 0).toFixed(1)}°`
      );
    } catch (error) {
      console.error('Failed to send location update:', error);
    }
  }

  async sendLocationUpdateManual(location: Location.LocationObject) {
    if (!this.socket || !this.driverId) return;

    this.currentLocation = location;

    await this.saveCurrentLocation();

    try {
      const data = await this.createDriverData();
      this.socket.emit('driver:updateLocation', data);
      console.log(
        `📍 Location Websocket Manual - Lat: ${this.currentLocation.coords.latitude.toFixed(
          6
        )}, Lng: ${this.currentLocation.coords.longitude.toFixed(6)}, Speed: ${(
          (this.currentLocation.coords.speed || 0) * 3.6
        ).toFixed(
          1
        )} km/h, Heading: ${(this.currentLocation.coords.heading || 0).toFixed(1)}°`
      );
    } catch (error) {
      console.error('Failed to send location update:', error);
    }
  }

  // Remove all socket listeners
  private cleanupEventListeners() {
    if (!this.socket) return;
    this.socket.off('message');
    this.socket.off('reconnect');
    this.socket.off('reconnect_failed');
    this.socket.off('disconnect');
    this.socket.off('connect_error');
    this.hasSetupListeners = false;
  }

  // Reset internal state
  private cleanupSocketState() {
    this.socket = null;
    this.currentLocation = null;
    this.isConnecting = false;
    this.lastRegisterAt = 0;
  }

  // Disconnect from server and reset internal state
  async disconnect() {
    console.log('❌ Disconnecting Websocket');

    this.cleanupEventListeners();

    if (this.socket?.connected) {
      this.socket.disconnect();
    }

    this.cleanupSocketState();
  }
}

// Export a singleton instance
export const webSocketService = new WebSocketServiceClass();
