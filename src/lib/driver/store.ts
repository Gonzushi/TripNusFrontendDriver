import { create } from 'zustand';

type DriverStore = {
  isOnline: boolean;
  walletBalance: number;
  setOnline: (status: boolean) => void;
  setWalletBalance: (balance: number) => void;
};

export const useDriverStore = create<DriverStore>((set) => ({
  isOnline: false,
  walletBalance: 0,
  setOnline: (status) => set({ isOnline: status }),
  setWalletBalance: (balance) => set({ walletBalance: balance }),
}));
