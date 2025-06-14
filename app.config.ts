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
      UIBackgroundModes: ['remote-notification', 'location', 'fetch'],
      'aps-environment': 'development',
      NSLocationWhenInUseUsageDescription:
        'Aplikasi ini menggunakan lokasi Anda untuk menampilkan tempat-tempat terdekat.',
      NSLocationAlwaysUsageDescription:
        'Aplikasi ini menggunakan lokasi Anda di latar belakang untuk meningkatkan pengalaman Anda.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'TripNus Driver memerlukan lokasi Anda untuk melacak posisi saat menerima dan menjalankan pesanan penumpang, termasuk ketika aplikasi berjalan di latar belakang.',
      NSPhotoLibraryUsageDescription:
        'TripNus memerlukan akses ke galeri foto Anda untuk mengunggah dokumen seperti KTP, SIM, dan STNK.',
      NSCameraUsageDescription:
        'TripNus memerlukan akses ke kamera Anda untuk mengambil foto dokumen seperti KTP, SIM, dan STNK.',
      BGTaskSchedulerPermittedIdentifiers: [
        'driver-alive-task',
        'background-location-task',
      ],
      LSApplicationQueriesSchemes: ['whatsapp', 'tel', 'mailto', 'https'],
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
    permissions: [
      'CAMERA',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
      'ACCESS_BACKGROUND_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.WAKE_LOCK',
      'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
    ],
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
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'TripNus Driver memerlukan akses lokasi untuk mengetahui posisi Anda saat menerima dan menjalankan orderan penumpang.',
        locationAlwaysPermission:
          'TripNus Driver memerlukan akses lokasi untuk mengetahui posisi Anda saat menerima dan menjalankan orderan penumpang, termasuk saat aplikasi berjalan di latar belakang.',
        locationWhenInUsePermission:
          'TripNus Driver memerlukan akses lokasi untuk mengetahui posisi Anda saat menerima dan menjalankan orderan penumpang.',
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
      },
    ],
    'expo-task-manager',
  ],
  experiments: { typedRoutes: true },
  extra: { ...ClientEnv, eas: { projectId: Env.EAS_PROJECT_ID } },
});
