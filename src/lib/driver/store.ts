import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { getDriverProfileApi, updateDriverProfileApi } from '@/api/driver';
import { getRideDriverApi } from '@/api/ride';
import { type AuthData } from '@/api/types/auth';
import { type AvailabilityStatus } from '@/api/types/driver';
import {
  startBackgroundUpdates,
  stopBackgroundUpdates,
} from '@/lib/background/location-service';
import { webSocketService } from '@/lib/background/websocket-service';
import { notificationEmitter } from '@/lib/notification-handler';

import {
  DRIVER_AVAILABILITY_STATUS_KEY,
  PICK_UP_LOCATION_KEY,
} from '../background/constants';

type DriverStore = {
  authData: AuthData | null;
  isOnline: boolean;
  lastManualUpdate: number;
  lastSync: number;
  isLoading: boolean;
  checkInitialOnlineStatus: boolean;
  availabilityStatus: AvailabilityStatus;
  setAuthData: (authData: AuthData | null) => void;
  setOnline: (status: boolean) => Promise<void>;
  syncOnlineStatus: () => Promise<void>;
  setAvailabilityStatus: (status: AvailabilityStatus) => void;
};

export const useDriverStore = create<DriverStore>((set, get) => {
  // Listen for suspension events
  let suspensionTimeout: ReturnType<typeof setTimeout> | null = null;

  notificationEmitter.on('account:suspended', async () => {
    const now = Date.now();
    const state = get();

    // Clear any existing timeout
    if (suspensionTimeout) {
      clearTimeout(suspensionTimeout);
    }

    // Debounce suspension handling (3 seconds)
    if (now - state.lastSync < 3000) {
      return;
    }

    // Only proceed if we're currently online
    if (!state.isOnline) {
      return;
    }

    // Set a timeout to prevent multiple rapid setOnline calls
    suspensionTimeout = setTimeout(async () => {
      await state.setOnline(false);
      suspensionTimeout = null;
    }, 100);
  });

  return {
    authData: null,
    isOnline: false,
    lastManualUpdate: 0,
    lastSync: 0,
    isLoading: false,
    checkInitialOnlineStatus: true,
    availabilityStatus: 'available',
    setAuthData: (authData) => set({ authData }),
    setOnline: async (status) => {
      // Get current state
      const state = get();

      // Prevent redundant calls
      if (state.isLoading) {
        return;
      } else {
        set({ isLoading: true });
      }

      // Log the current state
      console.log('------ Set Online =', status, '------');

      // Prevent redundant calls
      if (state.isOnline === status) {
        console.log('Skipping setOnline - already in desired state');
        return;
      }

      try {
        if (status) {
          if (
            !state.authData?.driverId ||
            !state.authData?.driverVehicleType ||
            !state.authData?.session.access_token
          ) {
            throw new Error('Missing driver information');
          }

          const { error: driverError } = await updateDriverProfileApi(
            state.authData?.session.access_token,
            {
              is_online: true,
              is_suspended: false,
              availability_status: 'available',
              decline_count: 0,
              missed_requests: 0,
            }
          );

          if (driverError) {
            throw new Error(driverError);
          }

          await state.setAvailabilityStatus('available');

          await startBackgroundUpdates();

          await webSocketService.connect(
            state.authData?.driverId,
            state.authData?.driverVehicleType
          );
        } else {
          if (!state.authData?.session.access_token) {
            throw new Error('Missing access token');
          }

          await stopBackgroundUpdates();
          await webSocketService.disconnect();

          await updateDriverProfileApi(state.authData?.session.access_token, {
            is_online: false,
            is_suspended: false,
            availability_status: 'not_available',
            decline_count: 0,
            missed_requests: 0,
          });
        }

        set({
          isOnline: status,
          lastManualUpdate: Date.now(),
        });
      } catch (error) {
        console.error('Error in setOnline:', error);
        if (error instanceof Error) {
          alert(
            `Failed to go ${status ? 'online' : 'offline'}: ${error.message}`
          );
        } else {
          alert(`Failed to go ${status ? 'online' : 'offline'}: ${error}`);
        }
      } finally {
        set({ isLoading: false });
      }
    },
    syncOnlineStatus: async () => {
      // Get current state
      const state = get();

      // Prevent redundant calls
      if (state.isLoading) {
        return;
      } else {
        set({ isLoading: true });
      }

      // Check if access token is present
      if (!state.authData?.session.access_token) {
        console.error('Missing access token');
        set({ isLoading: false, checkInitialOnlineStatus: false });
        return;
      }

      // Get current timestamp
      const now = Date.now();

      // Skip if manual update was recent (10 seconds)
      if (now - state.lastManualUpdate < 10 * 1000) {
        set({ isLoading: false, checkInitialOnlineStatus: false });
        return;
      }

      // Skip if last sync was recent (10 seconds)
      if (now - state.lastSync < 10 * 1000) {
        set({ isLoading: false, checkInitialOnlineStatus: false });
        return;
      }

      // Log the current state
      console.log('------ Sync Online Status ------');

      try {
        // Update lastSync timestamp before making the API call
        set({ lastSync: now, checkInitialOnlineStatus: true });

        const { data: driverData, error: driverError } =
          await getDriverProfileApi(state.authData?.session.access_token);

        if (driverError) {
          throw new Error(driverError);
        }

        if (!driverData) {
          throw new Error('Driver data not found');
        }

        const availabilityStatus = driverData?.availability_status;

        set({ availabilityStatus });

        await state.setAvailabilityStatus(availabilityStatus!);

        if (driverData.is_online === true) {
          if (
            state.authData?.driverId &&
            state.authData?.driverVehicleType &&
            state.authData?.driverVehiclePlateNumber
          ) {
            await webSocketService.connect(
              state.authData?.driverId,
              state.authData?.driverVehicleType
            );

            await startBackgroundUpdates();

            set({ isOnline: true });
          }
        } else if (driverData?.is_online === false) {
          await webSocketService.disconnect();
          await stopBackgroundUpdates();

          set({ isOnline: false });
        }
        set({ checkInitialOnlineStatus: false });
      } catch (error) {
        console.error('Error syncing online status:', error);
        set({ checkInitialOnlineStatus: false, isLoading: false });
      }
      set({ isLoading: false });
    },
    setAvailabilityStatus: async (status: AvailabilityStatus) => {
      const state = get();

      if (!state.authData?.session.access_token) {
        return;
      }

      await AsyncStorage.setItem(DRIVER_AVAILABILITY_STATUS_KEY, status);

      if (status === 'en_route_to_pickup' || status === 'waiting_at_pickup') {
        const { data: rideData, error: rideError } = await getRideDriverApi(
          state.authData?.session.access_token
        );

        if (!rideError && rideData) {
          await AsyncStorage.setItem(
            PICK_UP_LOCATION_KEY,
            JSON.stringify({
              latitude: rideData.planned_pickup_coords?.coordinates[1],
              longitude: rideData.planned_pickup_coords?.coordinates[0],
            })
          );
        }
      } else {
        await AsyncStorage.removeItem(PICK_UP_LOCATION_KEY);
      }
    },
  };
});
