import AsyncStorage from '@react-native-async-storage/async-storage';
import { SplashScreen, useRouter } from 'expo-router';
import React, {
  createContext,
  type PropsWithChildren,
  useEffect,
  useState,
} from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

import {
  changePasswordApi,
  forgotPasswordApi,
  loginApi,
  logoutApi,
  refreshTokenApi,
  registerApi,
  resendActivationApi,
} from '@/api/auth';
import { type AuthData } from '@/api/types/auth';
import { AUTH_STORAGE_KEY } from '@/constants';
import {
  clearProfilePicture,
  downloadAndSaveProfilePicture,
} from '@/lib/profile-picture';

import { useDriverStore } from '../../store';
import { type AuthContextType, type AuthStateInternal } from '../../types/auth';

// Create context with default values
export const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  isReady: false,
  authData: null,
  setAuthData: async () => {},
  register: async () => {},
  resendActivation: async () => false,
  forgotPassword: async () => {},
  changePassword: async () => {},
  logIn: async () => {},
  logOut: async () => {},
  refreshToken: async () => null,
  checkAndRefreshToken: async () => null,
});

export function AuthProvider({ children }: PropsWithChildren) {
  const [isReady, setIsReady] = useState(false);
  const [authState, setAuthState] = useState<AuthStateInternal>({
    isLoggedIn: false,
    data: null,
  });
  const router = useRouter();
  const { setOnline } = useDriverStore();

  // Auth State Management
  const updateAuthState = async (newState: AuthStateInternal) => {
    try {
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newState));
      setAuthState(newState);
    } catch (error) {
      console.error('Error saving auth state:', error);
    }
  };

  const setAuthData = async (data: AuthData) => {
    await updateAuthState({ isLoggedIn: true, data });
  };

  // Token Management
  const checkAndRefreshToken = async (
    data: AuthData
  ): Promise<AuthData | null> => {
    const now = Math.floor(Date.now() / 1000);

    if (data.session.expires_at > now) return data;

    const { data: tokenData, error: tokenError } = await refreshTokenApi(
      data.session.refresh_token
    );

    if (!tokenError) {
      await updateAuthState({ isLoggedIn: true, data: tokenData });
    } else {
      await updateAuthState({ isLoggedIn: false, data: null });
    }
    return tokenData;
  };

  const refreshToken = async (data: AuthData): Promise<AuthData | null> => {
    const { data: tokenData, error: tokenError } = await refreshTokenApi(
      data.session.refresh_token
    );
    if (!tokenError) {
      await updateAuthState({ isLoggedIn: true, data: tokenData });
    }
    return tokenData;
  };

  // Auth Actions
  const logIn = async (email: string, password: string) => {
    const { data: loginData, error: loginError } = await loginApi(
      email,
      password
    );

    if (!loginError && loginData) {
      await updateAuthState({ isLoggedIn: true, data: loginData });
      if (loginData.driverProfilePictureUrl) {
        await downloadAndSaveProfilePicture(
          loginData.user.id,
          loginData.driverProfilePictureUrl
        );
      }
      if (router.canDismiss()) {
        router.dismissAll();
      }
      router.replace('/');
    } else if (loginError === 'Email not confirmed') {
      router.push({ pathname: '/resend', params: { email } });
    } else {
      Alert.alert(
        'Gagal Masuk',
        loginError || 'Email atau kata sandi tidak valid.'
      );
    }
  };

  const register = async (email: string, password: string) => {
    const { error: registerError } = await registerApi(email, password);

    if (!registerError) {
      Alert.alert(
        'Registrasi Berhasil',
        'Silakan periksa email Anda untuk mengaktifkan akun.',
        [{ text: 'OK', onPress: () => router.replace('/login') }]
      );
    } else {
      // Translate specific error messages
      let translatedError = registerError;
      if (
        registerError ===
        'This email is already registered. Please log in or reset your password.'
      ) {
        translatedError =
          'Email ini sudah terdaftar. Silakan masuk atau atur ulang kata sandi Anda.';
      }

      Alert.alert(
        'Registrasi Gagal',
        translatedError || 'Terjadi kesalahan saat registrasi.'
      );
    }
  };

  const resendActivation = async (email: string): Promise<boolean> => {
    const { error: resendError } = await resendActivationApi(email);

    if (!resendError) return true;

    Alert.alert('Error', resendError || 'Gagal mengirim email aktivasi');
    return false;
  };

  const changePassword = async (
    type: string,
    tokenHash: string,
    password: string
  ) => {
    const { error: changePasswordError } = await changePasswordApi(
      type,
      tokenHash,
      password
    );

    if (!changePasswordError) {
      Alert.alert('Berhasil', 'Kata sandi berhasil diubah', [
        {
          text: 'OK',
          onPress: () => {
            if (router.canDismiss()) {
              router.dismissAll();
            }
            router.replace('/welcome');
          },
        },
      ]);
    } else {
      Alert.alert('Error', changePasswordError || 'Gagal mengubah kata sandi', [
        {
          text: 'OK',
          onPress: () => {
            if (router.canDismiss()) {
              router.dismissAll();
            }
            router.replace('/welcome');
          },
        },
      ]);
    }
  };

  const forgotPassword = async (email: string) => {
    const { error: forgotPasswordError } = await forgotPasswordApi(email);

    if (!forgotPasswordError) {
      Alert.alert(
        'Reset Kata Sandi',
        'Jika akun dengan email ini ada, Anda akan menerima instruksi untuk mengatur ulang kata sandi.',
        [
          {
            text: 'OK',
            onPress: () => {
              if (router.canDismiss()) {
                router.dismissAll();
              }
              router.replace('/login');
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Error',
        forgotPasswordError || 'Gagal memproses permintaan reset kata sandi'
      );
    }
  };

  const logOut = async () => {
    try {
      if (authState.data?.session.access_token) {
        const { error: logoutError } = await logoutApi(
          authState.data.session.access_token
        );
        if (logoutError) {
          Alert.alert('Error', logoutError || 'Gagal logout');
        }
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setOnline(false);
      const userId = authState.data?.user.id;
      await updateAuthState({ isLoggedIn: false, data: null });
      if (userId) {
        await clearProfilePicture(userId);
      }
      router.replace('/welcome');
    }
  };

  // Initialization
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const value = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (value) {
          const storedState = JSON.parse(value);

          if (storedState.isLoggedIn && storedState.data) {
            const validData = await checkAndRefreshToken(storedState.data);
            await updateAuthState({
              isLoggedIn: !!validData,
              data: validData,
            });
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      }
      setIsReady(true);
    };

    initializeAuth();
  }, []);

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: authState.isLoggedIn,
        isReady,
        authData: authState.data,
        setAuthData,
        register,
        resendActivation,
        changePassword,
        forgotPassword,
        logIn,
        logOut,
        refreshToken,
        checkAndRefreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
