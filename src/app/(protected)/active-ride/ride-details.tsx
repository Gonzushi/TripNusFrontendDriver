import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
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
  AppState,
  Dimensions,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { AuthContext } from '@/lib/auth';
import { useDriverStore } from '@/lib/driver/store';
import { cancelRideByDriver, getActiveRideByDriver } from '@/lib/ride/api';
import { type RideData } from '@/lib/ride/types';
import { SafeView } from '@/lib/safe-view';

type DriverLocation = {
  latitude: number;
  longitude: number;
};

const openInGoogleMaps = (lat: number, lng: number) => {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  Linking.openURL(url);
};

export default function RideDetails() {
  const { authData } = useContext(AuthContext);
  const { setAvailabilityStatus } = useDriverStore();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [rideData, setRideData] = useState<RideData | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(
    null
  );
  const [isCancelling, setIsCancelling] = useState(false);
  const [isFollowingDriver, setIsFollowingDriver] = useState(false);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(
    null
  );
  const [rideStatus, setRideStatus] = useState<'pickup' | 'dropoff'>('pickup');

  const mapRef = useRef<MapView | null>(null);
  const hasInitializedMap = useRef(false);
  const translateX = useSharedValue(0);
  const screenWidth = Dimensions.get('window').width;
  const sliderWidth = screenWidth - 32; // Accounting for padding
  const threshold = sliderWidth - 100; // Threshold to trigger confirmation

  const handlePickupConfirmation = () => {
    // TODO: Implement pickup passenger logic
    console.log('Passenger picked up');
    setRideStatus('dropoff');
    translateX.value = withSpring(0, { damping: 15 });
  };

  const handleDropoffConfirmation = () => {
    // TODO: Implement dropoff passenger logic
    console.log('Passenger dropped off');
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
    })
    .onUpdate((event) => {
      'worklet';
      const newX = event.translationX;
      translateX.value = Math.max(0, Math.min(newX, sliderWidth - 56));
    })
    .onEnd(() => {
      'worklet';
      if (translateX.value > threshold) {
        translateX.value = withSpring(sliderWidth - 56, { damping: 15 });
        if (rideStatus === 'pickup') {
          runOnJS(handlePickupConfirmation)();
        } else {
          runOnJS(handleDropoffConfirmation)();
        }
      } else {
        translateX.value = withSpring(0, { damping: 15 });
      }
    });

  const sliderStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Add cleanup function
  const stopLocationTracking = useCallback(() => {
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove();
      locationSubscriptionRef.current = null;
    }
  }, []);

  // Update startLocationTracking to store the subscription
  const startLocationTracking = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === 'granted') {
        // Get initial location with lower accuracy for battery saving
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setDriverLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced, // Use low accuracy for battery saving
            timeInterval: 120 * 1000, // 2 minutes
            distanceInterval: 50, // 50 meters
            mayShowUserSettingsDialog: false, // Don't show settings dialog
          },
          (location) => {
            const newLocation = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };
            setDriverLocation(newLocation);

            // Only update map region if following driver and app is in foreground
            if (
              isFollowingDriver &&
              mapRef.current &&
              AppState.currentState === 'active'
            ) {
              mapRef.current.animateToRegion(
                {
                  ...newLocation,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                },
                1000
              );
            }

            // Check distance to pickup point
            if (rideData?.planned_pickup_coords.coordinates) {
              // Only update map if following driver
              if (isFollowingDriver && mapRef.current) {
                mapRef.current.animateToRegion(
                  {
                    latitude: newLocation.latitude,
                    longitude: newLocation.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                  },
                  500
                );
              }
            }
          }
        );
        locationSubscriptionRef.current = subscription;
      } else {
        Alert.alert(
          'Location Permission',
          'Location permission is optional. You can use Google Maps for navigation.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error starting location tracking:', error);
      Alert.alert(
        'Location Error',
        'Failed to start location tracking. You can still use Google Maps for navigation.',
        [{ text: 'OK' }]
      );
    }
  }, [isFollowingDriver, rideData]);

  // Handle app state changes with debounce
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      // Clear any pending timeouts
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Stop tracking immediately when going to background
        stopLocationTracking();
      } else if (nextAppState === 'active') {
        // Add a small delay before starting tracking again
        // This prevents rapid start/stop when app is quickly backgrounded/foregrounded
        timeoutId = setTimeout(() => {
          startLocationTracking();
        }, 1000);
      }
    });

    return () => {
      subscription.remove();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [startLocationTracking, stopLocationTracking]);

  // Start location tracking on mount
  useEffect(() => {
    startLocationTracking();
    return () => {
      stopLocationTracking();
    };
  }, [startLocationTracking, stopLocationTracking]);

  // Initial map setup
  useEffect(() => {
    if (
      !mapRef.current ||
      !rideData ||
      !driverLocation ||
      hasInitializedMap.current
    )
      return;

    const pickupCoords = rideData.planned_pickup_coords.coordinates;
    const dropoffCoords = rideData.planned_dropoff_coords.coordinates;

    mapRef.current.fitToCoordinates(
      [
        { latitude: pickupCoords[1], longitude: pickupCoords[0] },
        { latitude: dropoffCoords[1], longitude: dropoffCoords[0] },
        driverLocation,
      ],
      {
        edgePadding: { top: 130, right: 50, bottom: 50, left: 50 },
        animated: true,
      }
    );
    hasInitializedMap.current = true;
  }, [rideData, driverLocation]);

  // Fetch ride data
  useEffect(() => {
    const fetchRideData = async () => {
      if (!authData?.session.access_token || !authData?.driverId) return;

      try {
        const { data, error } = await getActiveRideByDriver(
          authData.session.access_token
        );

        if (error || !data) {
          Alert.alert('Error', 'No active ride found.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        } else {
          setRideData(data);
        }
      } catch {
        Alert.alert('Error', 'An unexpected error occurred.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRideData();
  }, [authData]);

  // Update cancel handler
  const handleCancel = async () => {
    if (!authData?.session.access_token || !rideData) return;

    Alert.alert(
      'Batalkan Perjalanan',
      'Apakah Anda yakin ingin membatalkan perjalanan ini?',
      [
        {
          text: 'Tidak',
          style: 'cancel',
        },
        {
          text: 'Ya',
          onPress: async () => {
            try {
              setIsCancelling(true);
              stopLocationTracking();
              setAvailabilityStatus('available');
              const { error } = await cancelRideByDriver(
                authData.session.access_token,
                rideData.id,
                authData.driverId!
              );

              if (error) {
                throw new Error(
                  typeof error === 'string' ? error : 'Failed to cancel ride'
                );
              }

              router.back();
            } catch (error) {
              console.error('Error cancelling ride:', error);
              Alert.alert('Error', 'Failed to cancel ride. Please try again.');
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  };

  const openWhatsApp = async (phoneNumber: string) => {
    try {
      // Remove any non-numeric characters from the phone number
      const phone = phoneNumber.replace(/\D/g, '');

      const message = encodeURIComponent(
        'Halo, saya driver TripNus. Saya akan segera menjemput Anda.'
      );
      const whatsappUrl = `whatsapp://send?phone=${phone}&text=${message}`;
      const waMeUrl = `https://wa.me/${phone}?text=${message}`;

      // First try to open WhatsApp app
      const canOpenWhatsApp = await Linking.canOpenURL(whatsappUrl);

      if (canOpenWhatsApp) {
        await Linking.openURL(whatsappUrl);
      } else {
        // If WhatsApp app is not installed, open in browser
        const canOpenWaMe = await Linking.canOpenURL(waMeUrl);
        if (canOpenWaMe) {
          await Linking.openURL(waMeUrl);
        } else {
          Alert.alert(
            'Error',
            'Tidak dapat membuka WhatsApp. Silakan coba lagi nanti.'
          );
        }
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      Alert.alert(
        'Error',
        'Tidak dapat membuka WhatsApp. Silakan coba lagi nanti.'
      );
    }
  };

  if (isLoading) {
    return (
      <SafeView
        isShowingTabBar={false}
        isShowingPaddingTop
        statusBarStyle="light"
        statusBackgroundColor="bg-blue-600"
      >
        <View className="flex-1 items-center justify-center bg-white">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeView>
    );
  }

  if (!rideData) {
    return (
      <SafeView
        isShowingTabBar={false}
        isShowingPaddingTop
        statusBarStyle="light"
        statusBackgroundColor="bg-blue-600"
      >
        <View className="flex-1 items-center justify-center bg-white">
          <Text className="text-lg text-gray-900">No active ride found</Text>
        </View>
      </SafeView>
    );
  }

  const fareAfterPlatformFee = rideData.fare - rideData.platform_fee;
  const percentCommission =
    ((fareAfterPlatformFee - rideData.driver_earning) / fareAfterPlatformFee) *
    100;

  const pickupCoords = rideData.planned_pickup_coords.coordinates;
  const dropoffCoords = rideData.planned_dropoff_coords.coordinates;

  return (
    <SafeView
      isShowingTabBar={false}
      isShowingPaddingTop
      statusBarStyle="light"
      statusBackgroundColor="bg-blue-600"
    >
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="-mb-4 bg-blue-600 px-4 pb-12 pt-4">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => router.back()}
              className="rounded-full p-2"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View className="flex-1 items-center">
              <Text className="mb-1 text-xl font-bold text-white">
                Perjalanan Aktif
              </Text>
            </View>
            <View className="w-10" />
          </View>
        </View>

        <ScrollView
          className="-mt-4 flex-1 rounded-t-3xl bg-white py-3"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Map */}
          <View className="-mt-4 h-[50vh] w-full overflow-hidden rounded-2xl border border-blue-300 shadow-sm">
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={{ height: '100%', width: '100%' }}
              showsUserLocation
              showsMyLocationButton={false}
            >
              {/* Pickup Marker */}
              <Marker
                coordinate={{
                  latitude: pickupCoords[1],
                  longitude: pickupCoords[0],
                }}
                title="Pickup Location"
                description={rideData.planned_pickup_address}
              >
                <MaterialCommunityIcons
                  name="map-marker"
                  size={40}
                  color="#3B82F6"
                />
              </Marker>

              {/* Dropoff Marker */}
              <Marker
                coordinate={{
                  latitude: dropoffCoords[1],
                  longitude: dropoffCoords[0],
                }}
                title="Dropoff Location"
                description={rideData.planned_dropoff_address}
              >
                <MaterialCommunityIcons
                  name="map-marker"
                  size={40}
                  color="#EF4444"
                />
              </Marker>
            </MapView>

            {/* Map Control Buttons */}
            <View className="absolute right-4 top-4 flex-row gap-1">
              <TouchableOpacity
                className="h-12 w-12 items-center justify-center rounded-full bg-white shadow-md active:bg-gray-100"
                onPress={() => {
                  if (mapRef.current) {
                    setIsFollowingDriver(false);
                    mapRef.current.animateToRegion(
                      {
                        latitude: pickupCoords[1],
                        longitude: pickupCoords[0],
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      },
                      1000
                    );
                  }
                }}
              >
                <MaterialCommunityIcons
                  name="map-marker"
                  size={24}
                  color="#3B82F6"
                />
              </TouchableOpacity>
              <TouchableOpacity
                className="h-12 w-12 items-center justify-center rounded-full bg-white shadow-md active:bg-gray-100"
                onPress={() => {
                  if (mapRef.current) {
                    setIsFollowingDriver(false);
                    mapRef.current.animateToRegion(
                      {
                        latitude: dropoffCoords[1],
                        longitude: dropoffCoords[0],
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      },
                      1000
                    );
                  }
                }}
              >
                <MaterialCommunityIcons
                  name="map-marker"
                  size={24}
                  color="#EF4444"
                />
              </TouchableOpacity>
              <TouchableOpacity
                className="h-12 w-12 items-center justify-center rounded-full bg-white shadow-md active:bg-gray-100"
                onPress={() => {
                  if (mapRef.current && driverLocation) {
                    setIsFollowingDriver(false);
                    mapRef.current.fitToCoordinates(
                      [
                        {
                          latitude: pickupCoords[1],
                          longitude: pickupCoords[0],
                        },
                        {
                          latitude: dropoffCoords[1],
                          longitude: dropoffCoords[0],
                        },
                        driverLocation,
                      ],
                      {
                        edgePadding: {
                          top: 130,
                          right: 50,
                          bottom: 50,
                          left: 50,
                        },
                        animated: true,
                      }
                    );
                  }
                }}
              >
                <Ionicons name="scan" size={24} color="#3B82F6" />
              </TouchableOpacity>
              <TouchableOpacity
                className="h-12 w-12 items-center justify-center rounded-full bg-white shadow-md active:bg-gray-100"
                onPress={() => {
                  if (mapRef.current && driverLocation) {
                    setIsFollowingDriver(true);
                    mapRef.current.animateToRegion(
                      {
                        ...driverLocation,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      },
                      1000
                    );
                  }
                }}
              >
                <Ionicons name="locate" size={24} color="#3B82F6" />
              </TouchableOpacity>
            </View>
          </View>

          <View className="px-6">
            {/* Driver Navigation Buttons */}
            <View className="mt-4 flex-row items-center gap-3">
              <TouchableOpacity
                className="flex-1 items-center justify-center rounded-3xl bg-blue-500 px-4 py-3 shadow-sm active:bg-blue-600"
                onPress={() =>
                  openInGoogleMaps(pickupCoords[1], pickupCoords[0])
                }
              >
                <Text className="font-semibold text-white">Lokasi Jemput</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 items-center justify-center rounded-3xl bg-red-500 px-4 py-3 shadow-sm active:bg-red-600"
                onPress={() =>
                  openInGoogleMaps(dropoffCoords[1], dropoffCoords[0])
                }
              >
                <Text className="font-semibold text-white">Lokasi Tujuan</Text>
              </TouchableOpacity>
              {/* Small phone icon button */}
              <TouchableOpacity
                onPress={() =>
                  Linking.openURL(`tel:${rideData.riders.users.phone}`)
                }
                className="ml-1 h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm"
                accessibilityLabel="Call Passenger"
              >
                <Ionicons name="call" size={18} color="#3B82F6" />
              </TouchableOpacity>
              {/* Small WhatsApp icon button */}
              <TouchableOpacity
                onPress={async () => {
                  await openWhatsApp(rideData.riders.users.phone);
                }}
                className="ml-1 h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm"
                accessibilityLabel="WhatsApp Passenger"
              >
                <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
              </TouchableOpacity>
            </View>

            {/* Custom Slide to Confirm Button */}
            <View className="mt-6 w-full">
              <View className="relative h-16 w-full overflow-hidden rounded-full border border-gray-200 bg-gray-50">
                <GestureDetector gesture={panGesture}>
                  <Animated.View
                    className={`absolute left-0 z-10 rounded-full ${
                      rideStatus === 'pickup' ? 'bg-blue-500' : 'bg-red-500'
                    }`}
                    style={[
                      {
                        top: 0,
                        height: 54,
                        width: 54,
                      },
                      sliderStyle,
                    ]}
                  >
                    <View className="h-full w-full items-center justify-center">
                      <Ionicons
                        name="chevron-forward"
                        size={24}
                        color="white"
                      />
                    </View>
                  </Animated.View>
                </GestureDetector>

                <View className="absolute inset-0 items-center justify-center">
                  <Text className="ml-8 text-base font-semibold text-gray-600">
                    {rideStatus === 'pickup'
                      ? 'Geser untuk Konfirmasi Penjemputan'
                      : 'Geser untuk Konfirmasi Pengantaran'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Warnings */}
            <View className="mt-8 space-y-3">
              <View className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                <View className="flex-row items-start">
                  <View className="-mt-0.5 mr-3">
                    <Ionicons
                      name="information-circle"
                      size={20}
                      color="#B45309"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-yellow-800">
                      Penting: Konfirmasi di Titik Penjemputan dan Tujuan
                    </Text>
                    <View className="mt-2 space-y-1">
                      <View className="flex-row">
                        <Text className="mr-2 text-sm text-yellow-700">•</Text>
                        <Text className="flex-1 text-sm text-yellow-700">
                          Pastikan Anda berada di lokasi penjemputan sebelum
                          mengkonfirmasi penjemputan
                        </Text>
                      </View>
                      <View className="flex-row">
                        <Text className="mr-2 text-sm text-yellow-700">•</Text>
                        <Text className="flex-1 text-sm text-yellow-700">
                          Konfirmasi pengantaran hanya setelah penumpang sampai
                          di tujuan
                        </Text>
                      </View>
                      <View className="flex-row">
                        <Text className="mr-2 text-sm text-yellow-700">•</Text>
                        <Text className="flex-1 text-sm text-yellow-700">
                          Kedua konfirmasi ini wajib dilakukan untuk
                          menyelesaikan perjalanan
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Driver Info Card */}
            <View className="mt-8 w-full rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
              <Text className="mb-4 text-lg font-semibold text-gray-900">
                Informasi Penumpang
              </Text>
              <View className="gap-2 space-y-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-gray-900">Nama Penumpang</Text>
                  <Text className="text-sm font-medium text-gray-900">
                    {rideData.riders.first_name} {rideData.riders.last_name}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-gray-900">Rating</Text>
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="star" size={16} color="#F59E0B" />
                    <Text className="text-sm font-medium text-gray-900">
                      {rideData.riders.rating.toFixed(1)}
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-gray-900">Nomor Telepon</Text>
                  <Text className="text-sm font-medium text-blue-600">
                    {rideData.riders.users.phone}
                  </Text>
                </View>
              </View>
            </View>

            {/* Trip & Earnings Info */}
            <View className="mt-8 w-full rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
              <Text className="mb-4 text-lg font-semibold text-gray-900">
                Detail Perjalanan
              </Text>
              <View className="space-y-1.5">
                <View className="flex-row">
                  <View className="mt-1.5 h-2 w-2 rounded-full bg-blue-500" />
                  <View className="flex-1 pl-3">
                    <Text className="text-sm font-medium text-gray-900">
                      {rideData.planned_pickup_address}
                    </Text>
                    <Text className="text-xs text-gray-500">
                      Lokasi Penjemputan
                    </Text>
                  </View>
                </View>
                <View className="ml-[3px] h-4 w-0.5 bg-gray-300" />
                <View className="flex-row">
                  <View className="mt-1.5 h-2 w-2 rounded-full bg-red-500" />
                  <View className="flex-1 pl-3">
                    <Text className="text-sm font-medium text-gray-900">
                      {rideData.planned_dropoff_address}
                    </Text>
                    <Text className="text-xs text-gray-500">Lokasi Tujuan</Text>
                  </View>
                </View>
              </View>

              <View className="mt-4 flex-row justify-between border-t border-blue-200 pt-4">
                <View>
                  <Text className="text-xl font-bold text-gray-900">
                    Rp {rideData.driver_earning.toLocaleString('id-ID')}
                  </Text>
                  <Text className="text-xs text-gray-500">
                    Estimasi Pendapatan
                  </Text>
                </View>
                <View>
                  <Text className="text-xl font-bold text-gray-900">
                    {Math.round(rideData.duration_s / 60)} min
                  </Text>
                  <Text className="text-xs text-gray-500">Durasi</Text>
                </View>
                <View>
                  <Text className="text-xl font-bold text-gray-900">
                    {(rideData.distance_m / 1000).toFixed(1)} km
                  </Text>
                  <Text className="text-xs text-gray-500">Jarak</Text>
                </View>
              </View>
            </View>

            {/* Earnings Breakdown */}
            <View className="my-6 w-full rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
              <Text className="mb-4 text-lg font-semibold text-gray-900">
                Rincian Pendapatan
              </Text>
              <View className="space-y-3">
                <BreakdownItem label="Total Biaya" value={rideData.fare} />
                <BreakdownItem
                  label="Biaya Platform (Ditanggung Penumpang)"
                  value={-rideData.platform_fee}
                  isNegative
                />
                <BreakdownItem
                  label="Setelah Biaya Platform"
                  value={fareAfterPlatformFee}
                  isDivider
                />
                <BreakdownItem
                  label={`Komisi Aplikasi (${percentCommission.toFixed(1)}%)`}
                  value={-rideData.app_commission}
                  isNegative
                />
                <View className="mt-4 justify-between border-t border-blue-200 pt-4">
                  <BreakdownItem
                    label="Total Pendapatan Driver"
                    value={rideData.driver_earning}
                    isBold
                  />
                </View>
              </View>
            </View>

            {/* Cancel Ride Button */}
            <TouchableOpacity
              className="mb-4 w-full items-center justify-center rounded-xl bg-red-500 px-4 py-3 shadow-sm active:bg-red-600"
              onPress={handleCancel}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator color="white" />
                  <Text className="font-semibold text-white">
                    Batalkan Perjalanan
                  </Text>
                </View>
              ) : (
                <Text className="font-semibold text-white">
                  Batalkan Perjalanan
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeView>
  );
}

const BreakdownItem = ({
  label,
  value,
  isNegative = false,
  isBold = false,
  isDivider = false,
}: {
  label: string;
  value: number;
  isNegative?: boolean;
  isBold?: boolean;
  isDivider?: boolean;
}) => {
  return (
    <View
      className={`${
        isDivider ? 'mt-3 border-t border-blue-200 pt-3' : ''
      } flex-row justify-between`}
    >
      <Text
        className={`${isBold ? 'text-base font-semibold' : 'text-sm'} text-gray-900`}
      >
        {label}
      </Text>
      <Text
        className={`${
          isBold
            ? 'text-base font-bold text-green-600'
            : isNegative
              ? 'text-sm font-medium text-red-600'
              : 'text-sm font-medium text-gray-900'
        }`}
      >
        Rp {Math.abs(value).toLocaleString('id-ID')}
      </Text>
    </View>
  );
};
