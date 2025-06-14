import { create } from 'zustand';

import {
  startBackgroundUpdates,
  stopBackgroundUpdates,
} from '@/lib/background/location-service';
import { webSocketService } from '@/lib/background/websocket-service';
import { notificationEmitter } from '@/lib/notification-handler';

import { getDriverProfileApi, updateDriverProfileApi } from './api';

type DriverStore = {
  accessToken: string | null;
  isOnline: boolean;
  walletBalance: number;
  driverId: string | null;
  driverVehicleType: string | null;
  driverVehiclePlateNumber: string | null;
  lastManualUpdate: number;
  lastSync: number;
  isLoading: boolean;
  checkInitialOnlineStatus: boolean;
  availability_status: string | null;
  setAccessToken: (token: string) => void;
  setDriverId: (id: string) => void;
  setVehicleType: (type: string) => void;
  setVehiclePlateNumber: (plate: string) => void;
  setOnline: (status: boolean) => Promise<void>;
  setWalletBalance: (balance: number) => void;
  syncOnlineStatus: () => Promise<void>;
  setIsLoading: (loading: boolean) => void;
  setAvailabilityStatus: (status: string) => void;
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
    accessToken: null,
    isOnline: false,
    walletBalance: 0,
    driverId: null,
    driverVehicleType: null,
    driverVehiclePlateNumber: null,
    lastManualUpdate: 0,
    lastSync: 0,
    isLoading: false,
    checkInitialOnlineStatus: true,
    availability_status: 'available',
    setAccessToken: (token) => set({ accessToken: token }),
    setDriverId: (id) => set({ driverId: id }),
    setVehicleType: (type) => set({ driverVehicleType: type }),
    setVehiclePlateNumber: (plate) => set({ driverVehiclePlateNumber: plate }),
    setOnline: async (status) => {
      console.log('------ Set Online =', status, '------');
      const state = get();

      // Prevent redundant calls
      if (state.isOnline === status) {
        console.log('Skipping setOnline - already in desired state');
        return;
      }

      set({ isLoading: true });

      try {
        if (status) {
          if (
            !state.driverId ||
            !state.driverVehicleType ||
            !state.driverVehiclePlateNumber ||
            !state.accessToken
          ) {
            throw new Error('Missing driver information');
          }

          await updateDriverProfileApi(state.accessToken, {
            is_online: true,
            is_suspended: false,
            availability_status: 'available',
            decline_count: 0,
            missed_requests: 0,
          });

          await startBackgroundUpdates();

          await webSocketService.connect(
            state.driverId,
            state.driverVehicleType,
            state.driverVehiclePlateNumber
          );
        } else {
          if (!state.accessToken) {
            throw new Error('Missing access token');
          }

          await stopBackgroundUpdates();
          await webSocketService.disconnect();

          await updateDriverProfileApi(state.accessToken, {
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
        return;
      } finally {
        set({ isLoading: false });
      }
    },

    setWalletBalance: (balance) => set({ walletBalance: balance }),
    syncOnlineStatus: async () => {
      const state = get();

      if (state.isLoading) return;

      set({ isLoading: true });

      if (!state.accessToken) {
        console.error('Missing access token');
        set({ isLoading: false, checkInitialOnlineStatus: false });
        return;
      }

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

      console.log('Syncing online status');

      try {
        // Update lastSync timestamp before making the API call
        await set({ lastSync: now, checkInitialOnlineStatus: true });

        const response = await getDriverProfileApi(state.accessToken);

        await set({ availability_status: response.data?.availability_status });

        if (response.data?.is_online === true && state.isOnline === false) {
          if (
            state.driverId &&
            state.driverVehicleType &&
            state.driverVehiclePlateNumber
          ) {
            await set({ isOnline: true });
            await set({ checkInitialOnlineStatus: false });

            await startBackgroundUpdates();

            await webSocketService.connect(
              state.driverId,
              state.driverVehicleType,
              state.driverVehiclePlateNumber
            );
          }
        } else if (
          response.data?.is_online === false &&
          state.isOnline === true
        ) {
          await set({ isOnline: false });
          await set({ checkInitialOnlineStatus: false });

          await stopBackgroundUpdates();
          await webSocketService.disconnect();
        } else {
          set({ checkInitialOnlineStatus: false });
        }
      } catch (error) {
        console.error('Error syncing online status:', error);
        set({ checkInitialOnlineStatus: false, isLoading: false });
      }
      set({ isLoading: false });
    },
    setIsLoading: (loading) => set({ isLoading: loading }),
    setAvailabilityStatus: (status) => set({ availability_status: status }),
  };
});
