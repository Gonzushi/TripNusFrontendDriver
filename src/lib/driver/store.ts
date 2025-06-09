import { create } from 'zustand';

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
  setOnline: (status: boolean) => void;
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
  setOnline: (status) => {
    if (status) {
      // Connect to WebSocket when going online
      const state = useDriverStore.getState();
      if (state.driverId) {
        webSocketService.connect(
          state.driverId,
          state.driverVehicleType!,
          state.driverVehiclePlateNumber!
        );
      }
    } else {
      // Disconnect from WebSocket when going offline
      webSocketService.disconnect();
    }
    set({ isOnline: status });
  },
  setWalletBalance: (balance) => set({ walletBalance: balance }),
}));
