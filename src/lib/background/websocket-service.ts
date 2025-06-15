import * as Location from 'expo-location';
import { router } from 'expo-router';
import { io, type Socket } from 'socket.io-client';

import NotificationHandler from '../notification-handler';
import { DEBUG_MODE } from './constants';
import { type DriverData } from './types';
import { debugLog } from './utlis';

// Constants
const WEBSOCKET_URL = 'wss://ws.trip-nus.com';
// const WEBSOCKET_URL = 'http://localhost:3001';

class WebSocketService {
  private socket: Socket | null = null;
  private driverId: string | null = null;
  private driverVehicleType: string | null = null;
  private driverVehiclePlateNumber: string | null = null;
  private currentLocation: Location.LocationObject | null = null;

  constructor() {
    this.socket = null;
    this.driverId = null;
    this.driverVehicleType = null;
    this.driverVehiclePlateNumber = null;
  }

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

  async connect(
    driverId: string,
    driverVehicleType: string,
    driverVehiclePlateNumber: string
  ): Promise<void> {
    if (
      this.socket?.connected &&
      this.driverId === driverId &&
      this.driverVehicleType === driverVehicleType &&
      this.driverVehiclePlateNumber === driverVehiclePlateNumber
    ) {
      await this.getCurrentLocation();
      await this.sendLocationUpdate();

      console.log('✅ Websocket already connected with same driver info');
      return;
    }

    if (this.socket?.connected) {
      console.log('Disconnecting existing connection before reconnecting');
      this.disconnect();
    }

    const hasPermission = await this.requestLocationPermission();
    if (!hasPermission) {
      console.error('Location permission denied');
      return;
    }

    this.driverId = driverId;
    this.driverVehicleType = driverVehicleType;
    this.driverVehiclePlateNumber = driverVehiclePlateNumber;

    return new Promise<void>((resolve, reject) => {
      this.socket = io(WEBSOCKET_URL, {
        transports: ['websocket'],
      });

      this.socket.once('connect', async () => {
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
        }
      });

      this.socket.once('connect_error', (err: Error) => {
        console.error('⚠️ Connection error:', err.message);
        reject(err);
      });

      this.setupEventListeners();
    });
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('message', async (data) => {
      debugLog(DEBUG_MODE, '📩 Server:', data);
      await NotificationHandler(data, router);
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnect Websocket');
    });

    this.socket.on('connect_error', (err: Error) => {
      console.error('⚠️ Connection error (repeat):', err.message);
    });
  }

  private async getCurrentLocation() {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    this.currentLocation = location;
  }

  private createDriverData(): DriverData {
    if (!this.driverId || !this.currentLocation)
      throw new Error('Missing driver data');

    return {
      socketId: this.socket!.id!,
      role: 'driver',
      id: this.driverId,
      lat: this.currentLocation.coords.latitude,
      lng: this.currentLocation.coords.longitude,
      vehicle_type:
        (this.driverVehicleType?.toLowerCase() as 'motorcycle' | 'car') ||
        'unknown',
      vehicle_plate: this.driverVehiclePlateNumber || 'Unknown',
      status: 'available',
      update_via: 'websocket',
      last_updated_at: new Date().toISOString(),
      speed_kph: (this.currentLocation.coords.speed || 0) * 3.6,
      heading_deg: this.currentLocation.coords.heading || 0,
      accuracy_m: this.currentLocation.coords.accuracy || 0,
    };
  }

  private async registerDriver() {
    if (!this.socket || !this.driverId || !this.currentLocation) return;

    try {
      const data = this.createDriverData();

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

  private async sendLocationUpdate() {
    if (!this.socket || !this.driverId || !this.currentLocation) return;

    try {
      const data = this.createDriverData();
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

  async disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.driverId = null;
      this.driverVehicleType = null;
      this.driverVehiclePlateNumber = null;
      this.currentLocation = null;
    }
  }
}

// Export a singleton instance
export const webSocketService = new WebSocketService();
