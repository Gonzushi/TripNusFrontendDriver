import type { ConfigContext, ExpoConfig } from '@expo/config';

import { ClientEnv, Env } from './env';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: Env.NAME,
  description: `${Env.NAME} Mobile App`,
  owner: Env.EXPO_ACCOUNT_OWNER,
  scheme: Env.SCHEME,
  slug: 'tripnusfrontenddriver',
  version: Env.VERSION.toString(),
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  updates: { fallbackToCacheTimeout: 0 },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: Env.BUNDLE_ID,
    config: {
      googleMapsApiKey: Env.GOOGLE_API_KEY,
    },
    infoPlist: {
      UIBackgroundModes: ['remote-notification'],
      'aps-environment': 'development',
      NSLocationWhenInUseUsageDescription:
        'This app uses your location to show nearby places.',
      NSLocationAlwaysUsageDescription:
        'This app uses your location in the background to improve your experience.',
      NSPhotoLibraryUsageDescription:
        'TripNus memerlukan akses ke galeri foto Anda untuk mengupload dokumen seperti KTP, SIM, dan STNK.',
      NSCameraUsageDescription:
        'TripNus memerlukan akses ke kamera Anda untuk mengambil foto dokumen seperti KTP, SIM, dan STNK.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: Env.PACKAGE,
    edgeToEdgeEnabled: false,
    googleServicesFile: Env.GOOGLE_SERVICES_FILE,
    config: {
      googleMaps: {
        apiKey: Env.GOOGLE_API_KEY,
      },
    },
    permissions: ['CAMERA', 'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE'],
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
    ],
    [
      'expo-build-properties',
      {
        ios: {
          useFrameworks: 'static',
        },
      },
    ],
    [
      'expo-notifications',
      {
        // "icon": "./assets/images/notification-icon.png",
        // "color": "#ffffff",
        // "sounds": ["./assets/sounds/notification.wav"],
        androidMode: 'default',
        androidCollapsedTitle: 'TripNus',
        iosDisplayInForeground: true,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'TripNus memerlukan akses ke galeri foto Anda untuk mengupload dokumen seperti Foto Profil, KTP, SIM, dan STNK.',
        cameraPermission:
          'TripNus memerlukan akses ke kamera Anda untuk mengambil foto dokumen seperti Foto Profil, KTP, SIM, dan STNK.',
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'Izinkan TripNus untuk mengakses kamera Anda',
        microphonePermission: 'Izinkan TripNusuntuk mengakses mikrofon Anda',
        recordAudioAndroid: true,
      },
    ],
  ],
  experiments: { typedRoutes: true },
  extra: { ...ClientEnv, eas: { projectId: Env.EAS_PROJECT_ID } },
});
