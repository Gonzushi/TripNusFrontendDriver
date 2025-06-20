import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useFocusEffect, usePathname, useRouter } from 'expo-router';
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  type AppStateStatus,
  Image,
  Linking,
  Platform,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { AuthContext } from '@/lib/auth';
import NotificationDebug from '@/lib/notification/notification-debug';
import { getProfilePictureUri } from '@/lib/profile-picture';
import { SafeView } from '@/lib/safe-view';
import { useDriverStore } from '@/store';

const DEBUG_MODE = false;

// Store for console logs
const consoleLogStore = {
  logs: [] as Array<{ timestamp: string; message: string }>,
  maxSize: 100,
  subscribers: [] as Array<() => void>,
  addLog(message: string) {
    this.logs.push({
      timestamp: new Date().toLocaleTimeString(),
      message,
    });
    if (this.logs.length > this.maxSize) {
      this.logs.shift();
    }
    this.subscribers.forEach((cb) => cb());
  },
  getLogs() {
    return this.logs;
  },
  subscribe(cb: () => void) {
    this.subscribers.push(cb);
  },
  unsubscribe(cb: () => void) {
    this.subscribers = this.subscribers.filter((fn) => fn !== cb);
  },
};

// Override console.log to capture logs
const originalConsoleLog = console.log;
console.log = (...args: Parameters<typeof console.log>) => {
  const message = args.map(String).join(' ');
  consoleLogStore.addLog(message);
  originalConsoleLog(...args);
};

// Console log viewer component (real-time)
function ConsoleLogViewer() {
  const [logs, setLogs] = useState(consoleLogStore.getLogs());
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const update = () => setLogs([...consoleLogStore.getLogs()]);
    consoleLogStore.subscribe(update);
    return () => {
      consoleLogStore.unsubscribe(update);
    };
  }, []);

  useEffect(() => {
    // Scroll to end whenever logs change
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [logs]);

  return (
    <View className="mt-4 px-4">
      <View
        className="rounded-xl border border-gray-800 bg-black p-4"
        style={{ minHeight: 120 }}
      >
        <Text className="mb-2 text-sm font-medium text-gray-100">
          Real-time Console Logs
        </Text>
        <ScrollView
          className="max-h-60"
          ref={scrollViewRef}
          onContentSizeChange={() => {
            if (scrollViewRef.current) {
              scrollViewRef.current.scrollToEnd({ animated: true });
            }
          }}
        >
          {logs.map((log, index) => (
            <View key={index} className="mb-2">
              <Text className="text-xs text-gray-400">{log.timestamp}:</Text>
              <Text className="text-xs text-gray-100">{log.message}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

// Wallet balance component
function WalletBalance({ balance }: { balance: number }) {
  return (
    <View className="px-4">
      <View className="rounded-xl border border-gray-200 bg-white p-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-base font-medium text-gray-800">
              Saldo Dompet
            </Text>
            <Text className="mt-1 text-2xl font-bold text-blue-600">
              Rp {balance.toLocaleString('id-ID')}
            </Text>
          </View>
          <View className="h-12 w-12 items-center justify-center rounded-full bg-blue-50">
            <Ionicons name="wallet" size={24} color="#3B82F6" />
          </View>
        </View>
        {balance < 0 && (
          <Text className="mt-2 text-sm font-medium text-red-500">
            Harap isi saldo untuk dapat menerima orderan
          </Text>
        )}
      </View>
    </View>
  );
}

// Online status toggle component
function OnlineStatusToggle({
  isOnline,
  onToggle,
  isDisabled,
  hasLocationPermission,
  isLoading,
}: {
  isOnline: boolean;
  onToggle: () => void;
  isDisabled: boolean;
  hasLocationPermission: boolean;
  isLoading: boolean;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [visualState, setVisualState] = useState(isOnline);
  const { checkInitialOnlineStatus, availabilityStatus } = useDriverStore();
  const router = useRouter();

  // Update animation when status changes
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isLoading ? 0.8 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isLoading]);

  // Update visual state with animation
  useEffect(() => {
    setVisualState(isOnline);
  }, [isOnline]);

  const handlePress = () => {
    if (
      availabilityStatus !== 'available' &&
      availabilityStatus !== 'not_available'
    ) {
      router.push('/active-ride/ride-details');
      return;
    }

    if (!hasLocationPermission && !visualState) {
      Alert.alert(
        'Izin Lokasi Diperlukan',
        'Untuk dapat menerima orderan, TripNus Driver memerlukan akses lokasi "Selalu Diizinkan". Silakan ubah pengaturan lokasi di pengaturan perangkat Anda.',
        [
          {
            text: 'Batal',
            style: 'cancel',
          },
          {
            text: 'Buka Pengaturan',
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            },
          },
        ]
      );
      return;
    }
    // Update visual state immediately for smooth transition
    setVisualState(!visualState);
    onToggle();
  };

  const getBackgroundColor = () => {
    if (
      availabilityStatus !== 'available' &&
      availabilityStatus !== 'not_available'
    )
      return '#059669'; // green-600
    if (checkInitialOnlineStatus) return '#D1D5DB'; // gray-300 during initial check
    if (isDisabled) return '#D1D5DB'; // gray-300
    if (isLoading) {
      return !visualState ? '#EF4444' : '#2563EB'; // red-500 : blue-600
    } else {
      return visualState ? '#EF4444' : '#2563EB'; // red-500 : blue-600
    }
  };

  const getButtonText = () => {
    if (
      availabilityStatus !== 'available' &&
      availabilityStatus !== 'not_available'
    )
      return 'Sedang Menjalani Order';
    if (isLoading || checkInitialOnlineStatus) {
      return checkInitialOnlineStatus
        ? 'Memeriksa Status...'
        : !visualState
          ? 'Menonaktifkan...'
          : 'Mengaktifkan...';
    }
    return visualState ? 'Berhenti Menerima Order' : 'Mulai Menerima Order';
  };

  return (
    <View className="mt-4">
      <View className="px-4">
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [
              {
                scale: fadeAnim.interpolate({
                  inputRange: [0.8, 1],
                  outputRange: [0.98, 1],
                }),
              },
            ],
          }}
        >
          <TouchableOpacity
            onPress={handlePress}
            disabled={isDisabled || isLoading || checkInitialOnlineStatus}
            style={{
              backgroundColor: getBackgroundColor(),
              borderRadius: 12,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isLoading || checkInitialOnlineStatus ? (
              <View className="flex-row items-center">
                <ActivityIndicator color="white" style={{ marginRight: 8 }} />
                <Text className="text-base font-semibold text-white">
                  {getButtonText()}
                </Text>
              </View>
            ) : (
              <>
                <Ionicons
                  name={
                    availabilityStatus !== 'available' &&
                    availabilityStatus !== 'not_available'
                      ? 'car'
                      : visualState
                        ? 'power'
                        : 'power-outline'
                  }
                  size={20}
                  color="white"
                  style={{ marginRight: 8 }}
                />
                <Text className="text-base font-semibold text-white">
                  {getButtonText()}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

// Header component with profile picture
function Header({
  firstName,
  profilePictureUri,
  onProfilePress,
  isOnline,
}: {
  firstName: string;
  profilePictureUri: string | null;
  onProfilePress: () => void;
  isOnline: boolean;
}) {
  // Use a ref to store the timestamp to prevent unnecessary re-renders
  const timestampRef = useRef(Date.now());

  return (
    <View className="px-4 pb-4 pt-6">
      <View className="flex-row items-center justify-between">
        <View className="mr-4 flex-1">
          <View className="flex-row items-baseline">
            <Text className="text-3xl text-gray-600">Hai, </Text>
            <Text className="text-3xl font-bold text-blue-600">
              {firstName}
            </Text>
          </View>
          <View className="mt-2">
            <View
              className={`flex-row items-center self-start rounded-full px-4 py-1.5 ${
                isOnline ? 'bg-green-100' : 'bg-gray-100'
              }`}
            >
              <View
                className={`mr-2 h-2 w-2 rounded-full ${
                  isOnline ? 'bg-green-500' : 'bg-gray-500'
                }`}
              />
              <Text
                className={`text-sm font-medium ${
                  isOnline ? 'text-green-700' : 'text-gray-700'
                }`}
              >
                {isOnline ? 'Sedang Aktif Menerima Order' : 'Tidak Aktif'}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={onProfilePress}
          className="h-20 w-20 items-center justify-center"
        >
          <View className="absolute h-[72px] w-[72px] rounded-full border-2 border-blue-500" />
          <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gray-200">
            {profilePictureUri ? (
              <Image
                className="h-full w-full"
                resizeMode="cover"
                source={{
                  uri: `${profilePictureUri}?timestamp=${timestampRef.current}`,
                  cache: 'reload',
                }}
              />
            ) : (
              <Ionicons name="person" size={32} color="#4B5563" />
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Stats card component
function StatCard({
  icon,
  iconColor,
  bgColor,
  borderColor,
  value,
  label,
  iconSize = 22,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  value: string;
  label: string;
  iconSize?: number;
}) {
  return (
    <View
      className={`aspect-square w-[31%] rounded-2xl border ${borderColor} ${bgColor} shadow-sm`}
    >
      <View className="flex-1 px-3 py-4">
        {/* Top 50%: Value and Icon */}
        <View
          style={{ flex: 5 }}
          className="flex-row items-center justify-between"
        >
          <Text className="text-xl font-bold text-gray-800">{value}</Text>
          <View
            className={`h-9 w-9 items-center justify-center rounded-full ${
              bgColor.replace('bg-', 'bg-') + '/90'
            }`}
          >
            <Ionicons name={icon} size={iconSize} color={iconColor} />
          </View>
        </View>

        {/* Bottom 50%: Label aligned top-left, no truncation */}
        <View
          style={{ flex: 5 }}
          className="w-full items-start justify-start pt-1"
        >
          <Text
            className="w-full text-[13px] leading-[17px] text-gray-600"
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {label}
          </Text>
        </View>
      </View>
    </View>
  );
}

// Stats section component
function StatsSection() {
  return (
    <View className="px-4 py-6">
      <Text className="mb-4 text-base font-medium text-gray-800">
        Ringkasan Perjalanan
      </Text>
      <View className="flex-row justify-between">
        <StatCard
          icon="car"
          iconColor="#3B82F6"
          bgColor="bg-blue-50"
          borderColor="border-blue-100"
          value="82"
          label="Total Perjalanan"
          iconSize={26}
        />
        <StatCard
          icon="map"
          iconColor="#8B5CF6"
          bgColor="bg-purple-50"
          borderColor="border-purple-100"
          value="13 km"
          label="Jarak Rata-rata"
          iconSize={20}
        />
        <StatCard
          icon="star"
          iconColor="#EAB308"
          bgColor="bg-yellow-50"
          borderColor="border-yellow-100"
          value="4.9"
          label="Penilaian"
          iconSize={26}
        />
      </View>
    </View>
  );
}

// Community support section component
function CommunitySupport({ onShare }: { onShare: () => void }) {
  return (
    <View className="px-4">
      <View className="rounded-xl border border-blue-300/100 bg-blue-50/50 p-5">
        <View className="flex-row items-start">
          <View className="flex-1">
            <Text className="mb-1 text-base font-medium text-gray-800">
              Ajak Rekan Driver Bergabung!
            </Text>
            <Text className="text-sm leading-5 text-gray-600">
              Punya teman yang ingin menambah penghasilan? Ajak mereka bergabung
              sebagai Mitra Driver TripNus! Dapatkan bonus tambahan untuk setiap
              rekomendasi yang berhasil bergabung.
            </Text>
            <TouchableOpacity
              onPress={onShare}
              className="mt-4 flex-row items-center"
            >
              <Text className="mr-1 font-medium text-blue-600">
                Ajak Teman Driver
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#2563EB" />
            </TouchableOpacity>
          </View>
          <View className="ml-4">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <Ionicons name="share-social" size={20} color="#3B82F6" />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function Index() {
  const { authData } = useContext(AuthContext);
  const router = useRouter();
  const [profilePictureUri, setProfilePictureUri] = useState<string | null>(
    null
  );
  const [hasLocationPermission, setHasLocationPermission] = useState(true);
  const {
    isOnline,
    isLoading,
    checkInitialOnlineStatus,
    setAuthData,
    setOnline,
    syncOnlineStatus,
  } = useDriverStore();

  const checkLocationPermissions = async () => {
    let { status: foregroundStatus } =
      await Location.getForegroundPermissionsAsync();

    if (foregroundStatus !== 'granted') {
      const requestForeground =
        await Location.requestForegroundPermissionsAsync();
      foregroundStatus = requestForeground.status;
    }

    let { status: backgroundStatus } =
      await Location.getBackgroundPermissionsAsync();

    if (foregroundStatus === 'granted' && backgroundStatus !== 'granted') {
      const requestBackground =
        await Location.requestBackgroundPermissionsAsync();
      backgroundStatus = requestBackground.status;
    }

    const hasPermission =
      foregroundStatus === 'granted' && backgroundStatus === 'granted';

    setHasLocationPermission(hasPermission);

    if (!hasPermission && isOnline) {
      await setOnline(false);
    }
  };

  // Check permissions and sync status when app comes to foreground
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let isMounted = true;
    let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        nextAppState === 'active' &&
        isMounted &&
        pathnameRef.current === '/'
      ) {
        if (debounceTimeout) clearTimeout(debounceTimeout);

        debounceTimeout = setTimeout(async () => {
          await checkLocationPermissions();
          await syncOnlineStatus();
        }, 1000); // ⏱️ 1 second debounce
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );

    // Initial sync (debounced as well)
    handleAppStateChange('active');

    return () => {
      isMounted = false;
      if (debounceTimeout) clearTimeout(debounceTimeout);
      subscription.remove();
    };
  }, []);

  // Check permissions and sync status when screen is focused
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const syncStatus = async () => {
        if (isMounted) {
          await checkLocationPermissions();
          await syncOnlineStatus();
        }
      };

      syncStatus();

      return () => {
        isMounted = false;
      };
    }, [])
  );

  // Save authData to driver store
  useEffect(() => {
    setAuthData(authData);
  }, [authData]);

  // Load profile picture
  const refreshProfilePicture = async () => {
    if (authData?.user.id) {
      const uri = await getProfilePictureUri(authData.user.id);
      setProfilePictureUri(uri);
    }
  };

  useEffect(() => {
    refreshProfilePicture();
  }, [authData?.user.id, authData?.riderProfilePictureUrl]);

  // Event handlers
  const handleToggleOnline = async () => {
    if (!isOnline) {
      // Check location permission when turning online
      await checkLocationPermissions();

      if (!hasLocationPermission) {
        Alert.alert(
          'Izin Lokasi Diperlukan',
          'Untuk dapat menerima orderan, TripNus Driver memerlukan akses lokasi "Selalu Diizinkan". Silakan ubah pengaturan lokasi di pengaturan perangkat Anda.',
          [
            {
              text: 'Batal',
              style: 'cancel',
            },
            {
              text: 'Buka Pengaturan',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              },
            },
          ]
        );
        return;
      }
    }

    await setOnline(!isOnline);
  };

  const handleInvite = async () => {
    try {
      const result = await Share.share({
        url: 'https://play.google.com/store/apps/details?id=com.tripnus',
        title: 'Bagikan TripNus',
        message:
          'Bergabunglah dengan saya di TripNus! Aplikasi ride-sharing lokal yang membuat transportasi lebih baik di Indonesia. Unduh sekarang!',
      });

      if (result.action === Share.sharedAction) {
        console.log(
          result.activityType
            ? 'Dibagikan dengan tipe aktivitas: ' + result.activityType
            : 'Berhasil dibagikan'
        );
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleProfilePress = () => {
    router.push('/profile');
  };

  return (
    <SafeView isShowingTabBar={true}>
      <ScrollView className="flex-1 bg-white">
        <Header
          firstName={authData?.driverFirstName || 'Teman'}
          profilePictureUri={profilePictureUri}
          onProfilePress={handleProfilePress}
          isOnline={isOnline && !checkInitialOnlineStatus}
        />

        <WalletBalance balance={0} />

        <StatsSection />

        <OnlineStatusToggle
          isOnline={isOnline}
          onToggle={handleToggleOnline}
          isDisabled={false}
          hasLocationPermission={hasLocationPermission}
          isLoading={isLoading}
        />

        {!hasLocationPermission && (
          <View className="mt-4 px-4">
            <View className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
              <View className="flex-row items-start">
                <View className="mr-3 mt-0.5">
                  <Ionicons name="warning" size={20} color="#B45309" />
                </View>
                <Text className="flex-1 text-sm text-yellow-800">
                  Untuk dapat menerima orderan, izinkan TripNus Driver mengakses
                  lokasi Anda dengan opsi "Selalu Diizinkan" di pengaturan
                  perangkat.
                </Text>
              </View>
            </View>
          </View>
        )}

        <View className="mt-4 px-4">
          <View className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
            <View className="flex-row items-start">
              <View className="mr-3 mt-0.5">
                <Ionicons name="information-circle" size={20} color="#B45309" />
              </View>
              <Text className="flex-1 text-sm text-yellow-800">
                Untuk tetap menerima order, pastikan aplikasi tetap berjalan di
                latar belakang. Jangan tutup aplikasi saat sedang online.
              </Text>
            </View>
          </View>
        </View>

        <View className="mb-6 mt-8 px-4">
          <View className="h-[1px] bg-gray-300" />
        </View>

        <CommunitySupport onShare={handleInvite} />

        {DEBUG_MODE && <ConsoleLogViewer />}

        {DEBUG_MODE && <NotificationDebug />}

        <View className="h-8" />
      </ScrollView>
    </SafeView>
  );
}
