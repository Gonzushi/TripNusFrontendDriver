import { create } from 'zustand';

import { startBackgroundUpdates, stopBackgroundUpdates } from '@/lib/background/location-service';
import { webSocketService } from '@/lib/websocket/websocket-service';

type DriverStore = {
  isOnline: boolean;
  walletBalance: number;
  driverId: string | null;
  driverVehicleType: string | null;
  driverVehiclePlateNumber: string | null;
  setDriverId: (id: string) => void;
  setVehicleType: (type: string) => void;
  setVehiclePlateNumber: (plate: string) => void;
  setOnline: (status: boolean) => Promise<void>;
  setWalletBalance: (balance: number) => void;
};

export const useDriverStore = create<DriverStore>((set) => ({
  isOnline: false,
  walletBalance: 0,
  driverId: null,
  driverVehicleType: null,
  driverVehiclePlateNumber: null,
  setDriverId: (id) => set({ driverId: id }),
  setVehicleType: (type) => set({ driverVehicleType: type }),
  setVehiclePlateNumber: (plate) => set({ driverVehiclePlateNumber: plate }),
  setOnline: async (status) => {
    if (status) {
      // Get current state
      const state = useDriverStore.getState();
      if (
        !state.driverId ||
        !state.driverVehicleType ||
        !state.driverVehiclePlateNumber
      ) {
        console.error('Missing driver information');
        return;
      }

      // Connect to WebSocket
      webSocketService.connect(
        state.driverId,
        state.driverVehicleType,
        state.driverVehiclePlateNumber
      );

      // Start background location updates
      await startBackgroundUpdates();
    } else {
      // Disconnect WebSocket
      webSocketService.disconnect();

      // Stop background location updates
      await stopBackgroundUpdates();
    }
    set({ isOnline: status });
  },
  setWalletBalance: (balance) => set({ walletBalance: balance }),
}));
