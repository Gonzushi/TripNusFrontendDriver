import { type AuthData } from '@/api/types/auth';

export type AuthStateInternal = {
  isLoggedIn: boolean;
  data: AuthData | null;
};

export type AuthContextType = {
  isLoggedIn: boolean;
  isReady: boolean;
  authData: AuthData | null;
  setAuthData: (data: AuthData) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  resendActivation: (email: string) => Promise<boolean>;
  forgotPassword: (email: string) => Promise<void>;
  changePassword: (
    type: string,
    tokenHash: string,
    password: string
  ) => Promise<void>;
  logIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  refreshToken: (data: AuthData) => Promise<AuthData | null>;
  checkAndRefreshToken: (data: AuthData) => Promise<AuthData | null>;
};
