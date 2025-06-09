import * as Location from 'expo-location';
import { io, type Socket } from 'socket.io-client';

// Constants
const WEBSOCKET_URL = 'wss://ws.trip-nus.com';
// const WEBSOCKET_URL = 'http://localhost:3001';

const LOCATION_UPDATE_INTERVAL = 5 * 1000;
const DISTANCE_UPDATE_INTERVAL = 0;

const DEFAULT_LOCATION = {
  lat: null,
  lng: null,
};

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

class WebSocketService {
  private socket: Socket | null = null;
  private locationSubscription: Location.LocationSubscription | null = null;
  private driverId: string | null = null;
  private driverVehicleType: string | null = null;
  private driverVehiclePlateNumber: string | null = null;
  private currentLocation: DriverData['location'] = { ...DEFAULT_LOCATION };
  private batteryLevel = 100;

  constructor() {
    this.socket = null;
    this.locationSubscription = null;
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
  ) {
    if (this.socket?.connected) {
      console.log('Already connected');
      return;
    }

    // Request location permissions first
    const hasPermission = await this.requestLocationPermission();
    if (!hasPermission) {
      console.error('Location permission denied');
      return;
    }

    this.driverId = driverId;
    this.driverVehicleType = driverVehicleType;
    this.driverVehiclePlateNumber = driverVehiclePlateNumber;

    // Get initial location
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      this.updateCurrentLocation(location);
    } catch (error) {
      console.error('Error getting initial location:', error);
    }

    this.socket = io(WEBSOCKET_URL, {
      transports: ['websocket'],
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Connected to server with ID:', this.socket?.id);
      this.registerDriver();
      this.startLocationUpdates();
    });

    this.socket.on('message', (data) => {
      console.log('📩 Server:', data);
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected');
      this.stopLocationUpdates();
    });

    this.socket.on('connect_error', (err: Error) => {
      console.error('⚠️ Connection error:', err.message);
    });
  }

  private updateCurrentLocation(location: Location.LocationObject) {
    this.currentLocation = {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
    };
  }

  private createDriverData(): DriverData {
    if (!this.driverId) throw new Error('Missing driver data');

    return {
      socketId: this.socket!.id!,
      role: 'driver',
      id: this.driverId,
      location: this.currentLocation,
      vehicle_type:
        (this.driverVehicleType?.toLowerCase() as 'motorcycle' | 'car') ||
        'unknown',
      vehicle_plate: this.driverVehiclePlateNumber || 'Unknown',
      status: 'available',
      update_via: 'websocket',
      last_updated_at: new Date().toISOString(),
      speed_kph: 0,
      heading_deg: 0,
      battery_level: this.batteryLevel,
      accuracy_m: 5,
    };
  }

  private registerDriver() {
    if (!this.socket || !this.driverId) return;

    try {
      const data = this.createDriverData();
      this.socket.emit('register', data);
    } catch (error) {
      console.error('Failed to register driver:', error);
    }
  }

  private async startLocationUpdates() {
    if (this.locationSubscription) return;

    try {
      // Start watching location
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: LOCATION_UPDATE_INTERVAL,
          distanceInterval: DISTANCE_UPDATE_INTERVAL,
        },
        (location) => {
          this.updateCurrentLocation(location);
          this.sendLocationUpdate();
        }
      );

      console.log('📍 Started location updates');
    } catch (error) {
      console.error('Error starting location updates:', error);
    }
  }

  private sendLocationUpdate() {
    if (!this.socket || !this.driverId) return;

    try {
      const data = this.createDriverData();
      this.socket.emit('driver:updateLocation', data);
      console.log(
        '📍 Websocket Location updated:',
        this.currentLocation.lat,
        ',',
        this.currentLocation.lng
      );
    } catch (error) {
      console.error('Failed to send location update:', error);
    }
  }

  private stopLocationUpdates() {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
      console.log('📍 Stopped location updates');
    }
  }

  disconnect() {
    this.stopLocationUpdates();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('🔌 Disconnected from server');
    }
  }
}

// Export a singleton instance
export const webSocketService = new WebSocketService();
