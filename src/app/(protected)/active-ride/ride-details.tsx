import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
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
  Image,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  cancelByDriverApi,
  confirmDropoffByDriverApi,
  confirmPickupByDriverApi,
  driverArrivedAtPickupApi,
  getRideDriverApi,
} from '@/api/ride';
import { type AvailabilityStatus } from '@/api/types/driver';
import { type RideDataDriver } from '@/api/types/ride';
import { AuthContext } from '@/lib/auth';
import { webSocketService } from '@/lib/background/websocket-service';
import { SUPABASE_STORAGE_URL } from '@/lib/profile-picture/constants';
import { SafeView } from '@/lib/safe-view';
import { useDriverStore } from '@/store';

type RideStatus =
  | 'searcching'
  | 'requesting_driver'
  | 'driver_accepted'
  | 'driver_arrived'
  | 'in_progress'
  | 'payment_in_progress'
  | 'completed'
  | 'cancelled';

const openInGoogleMaps = (lat: number, lng: number) => {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  Linking.openURL(url);
};

const openWhatsApp = async (phoneNumber: string) => {
  try {
    const phone = phoneNumber.replace(/\D/g, '');
    const message = encodeURIComponent(
      'Halo, saya driver TripNus. Saya akan segera menjemput Anda.'
    );
    const whatsappUrl = `whatsapp://send?phone=${phone}&text=${message}`;
    const waMeUrl = `https://wa.me/${phone}?text=${message}`;

    const canOpenWhatsApp = await Linking.canOpenURL(whatsappUrl);

    if (canOpenWhatsApp) {
      await Linking.openURL(whatsappUrl);
    } else {
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

const getColorByRideStatus = (status: string): string => {
  switch (status) {
    case 'driver_accepted':
      return '#3B82F6'; // blue-500
    case 'driver_arrived':
      return '#EF4444'; // red-500
    case 'in_progress':
      return '#16A34A'; // green-600
    default:
      return '#9CA3AF'; // gray-400
  }
};

const getLightBgByRideStatus = (status: string): string => {
  switch (status) {
    case 'driver_accepted':
      return '#DBEAFE'; // blue-100
    case 'driver_arrived':
      return '#FECACA'; // red-100
    case 'in_progress':
      return '#D1FAE5'; // green-100
    default:
      return '#F3F4F6'; // gray-100
  }
};

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

export default function RideDetails() {
  const insets = useSafeAreaInsets();
  const { authData } = useContext(AuthContext);
  const router = useRouter();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [rideData, setRideData] = useState<RideDataDriver | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [rideStatus, setRideStatus] = useState<RideStatus>('driver_accepted');
  const { setAvailabilityStatus } = useDriverStore();

  // Refs
  const mapRef = useRef<MapView | null>(null);
  const appState = useRef(AppState.currentState);
  const translateX = useSharedValue(0);
  const screenWidth = Dimensions.get('window').width;
  const sliderWidth = screenWidth;
  const threshold = sliderWidth * 0.8;

  // Handlers
  const handleArriveConfirmation = async () => {
    if (!authData?.session.access_token || !rideData) return;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const { error } = await driverArrivedAtPickupApi(
      authData.session.access_token,
      { ride_id: rideData.id, driver_id: authData.driverId! }
    );

    if (error) {
      throw new Error(error);
    } else {
      setAvailabilityStatus('driver_arrived' as AvailabilityStatus);
      webSocketService.sendLocationUpdateManual(location);
      setRideStatus('driver_arrived');
      translateX.value = withSpring(0, { damping: 15 });
    }
  };

  const handlePickupConfirmation = async () => {
    if (!authData?.session.access_token || !rideData) return;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const actualPickupCoords = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };

    const { error } = await confirmPickupByDriverApi(
      authData.session.access_token,
      {
        ride_id: rideData.id,
        driver_id: authData.driverId!,
        actual_pickup_coords: actualPickupCoords,
      }
    );

    if (error) {
      throw new Error(error);
    } else {
      setAvailabilityStatus('in_progress' as AvailabilityStatus);
      webSocketService.sendLocationUpdateManual(location);
      setRideStatus('in_progress');
    }

    translateX.value = withSpring(0, { damping: 15 });
  };

  const handleDropoffConfirmation = async () => {
    if (!authData?.session.access_token || !rideData) return;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const actualDropoffCoords = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };

    const { error } = await confirmDropoffByDriverApi(
      authData.session.access_token,
      {
        ride_id: rideData.id,
        driver_id: authData.driverId!,
        actual_dropoff_coords: actualDropoffCoords,
      }
    );

    if (error) {
      throw new Error(error);
    } else {
      setAvailabilityStatus('payment_in_progress' as AvailabilityStatus);
      webSocketService.sendLocationUpdateManual(location);
      setRideStatus('payment_in_progress');
    }
  };

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
              setAvailabilityStatus('available' as AvailabilityStatus);

              const { error } = await cancelByDriverApi(
                authData.session.access_token,
                { ride_id: rideData.id, driver_id: authData.driverId! }
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

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      'worklet';
      const newX = event.translationX;
      translateX.value = Math.max(0, Math.min(newX, sliderWidth));
    })
    .onEnd(() => {
      'worklet';
      if (translateX.value > threshold) {
        translateX.value = withSpring(sliderWidth, { damping: 15 });
        if (rideStatus === 'driver_accepted')
          runOnJS(handleArriveConfirmation)();
        else if (rideStatus === 'driver_arrived')
          runOnJS(handlePickupConfirmation)();
        else if (rideStatus === 'in_progress')
          runOnJS(handleDropoffConfirmation)();
      } else {
        translateX.value = withSpring(0, { damping: 15 });
      }
    });

  const sliderStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const fetchRideData = async () => {
    if (!authData?.session.access_token || !authData?.driverId) return;
    const { data, error } = await getRideDriverApi(
      authData.session.access_token
    );

    if (!error && data) {
      setRideData(data);
      setRideStatus(data.status as RideStatus);
    }
  };

  const showAllMarkers = async () => {
    if (!mapRef.current || !rideData) return;

    try {
      const pointsToFit = [];

      const pickup = rideData.planned_pickup_coords.coordinates;
      const dropoff = rideData.planned_dropoff_coords.coordinates;

      pointsToFit.push({ latitude: pickup[1], longitude: pickup[0] });
      pointsToFit.push({ latitude: dropoff[1], longitude: dropoff[0] });

      if (pointsToFit.length > 0) {
        mapRef.current.fitToCoordinates(pointsToFit, {
          edgePadding: { top: 130, right: 50, bottom: 75, left: 50 },
          animated: true,
        });
      }
    } catch (err) {
      console.error('Failed to get driver location:', err);
    } finally {
    }
  };

  const fetchRideDataAndFocus = async () => {
    await fetchRideData();
    await showAllMarkers();
  };

  useFocusEffect(
    useCallback(() => {
      fetchRideDataAndFocus();
    }, [])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const prev = appState.current;
      appState.current = nextAppState;
      if (prev === 'background' && nextAppState === 'active') {
        fetchRideDataAndFocus();
      }
    });
    return () => subscription.remove();
  }, [authData]);

  useEffect(() => {
    const initialize = async () => {
      await fetchRideDataAndFocus();
      setIsLoading(false);
    };
    initialize();
  }, []);

  useEffect(() => {
    if (rideData) {
      showAllMarkers();
    }
  }, [rideData]);

  const renderRiderInfo = (rider: NonNullable<RideDataDriver['riders']>) => {
    return (
      <>
        {/* Profile Picture */}
        <Image
          source={{
            uri: `${SUPABASE_STORAGE_URL}/${rider.profile_picture_url}`,
          }}
          className="mt-1 h-16 w-16 rounded-full bg-gray-200"
        />

        {/* Rider Info */}
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-900">
            {rider.fist_name} {rider.last_name}
          </Text>
          <View className="mt-0.5 flex-row items-center gap-1">
            <Ionicons name="star" size={16} color="#F59E0B" />
            <Text className="text-sm font-medium text-gray-900">
              {rider.rating?.toFixed(1) ?? '–'}
            </Text>
            <Text className="ml-1 text-sm text-gray-500">
              ({rider.completed_rides ?? 0} rides)
            </Text>
          </View>
        </View>

        {/* Contact Buttons */}
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => Linking.openURL(`tel:${rider.users.phone}`)}
            className="h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm"
            accessibilityLabel="Call Rider"
          >
            <Ionicons name="call" size={24} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={async () => {
              await openWhatsApp(rider.users.phone);
            }}
            className="h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm"
            accessibilityLabel="WhatsApp Rider"
          >
            <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
          </TouchableOpacity>
        </View>
      </>
    );
  };

  const renderRiderSkeleton = () => {
    return (
      <>
        {/* Skeleton Profile Picture */}
        <View className="h-16 w-16 rounded-full bg-gray-200" />

        {/* Skeleton Info */}
        <View className="flex-1 space-y-2">
          <View className="h-4 w-1/2 rounded-md bg-gray-200" />
          <View className="h-3 w-1/4 rounded-md bg-gray-100" />
        </View>

        {/* Skeleton Buttons */}
        <View className="flex-row gap-2">
          <View className="h-9 w-9 rounded-full bg-gray-200" />
          <View className="h-9 w-9 rounded-full bg-gray-200" />
        </View>
      </>
    );
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
      isShowingPaddingTop={false}
      statusBarStyle="dark"
      statusBackgroundColor="bg-blue-600"
    >
      <View className="flex-1 bg-white">
        <ScrollView
          className="flex-1 rounded-t-3xl bg-white"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          bounces={false} // ✅ disables overscroll bounce on iOS
          overScrollMode="never" // ✅ disables overscroll on Android
          contentInsetAdjustmentBehavior="never" // ✅ avoids auto inset shifting on iOS
        >
          {/* Map Container */}
          <View className="relative h-[60vh] w-full shadow-sm">
            {/* Map */}
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={{ height: '100%', width: '100%' }}
              showsUserLocation
              showsMyLocationButton={true}
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
            <View
              className="absolute left-4 right-4 flex-row items-center justify-between"
              style={{ top: insets.top }}
            >
              {/* Back Button */}
              <TouchableOpacity
                onPress={() => router.back()}
                className="active:bg-gray-100s rounded-xl bg-white p-2.5 shadow-md"
              >
                <Ionicons name="arrow-back" size={20} color="#111827" />
              </TouchableOpacity>

              {/* Map Controls */}
              <View className="flex-row gap-1">
                <TouchableOpacity
                  className="h-12 w-12 items-center justify-center rounded-full bg-white shadow-md active:bg-gray-100"
                  onPress={() => {
                    if (mapRef.current) {
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
                  onPress={showAllMarkers}
                >
                  <Ionicons name="scan" size={24} color="#3B82F6" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Bottom-Right Map Action Buttons */}
            <View className="absolute bottom-24 right-4 flex-col items-end gap-2">
              <TouchableOpacity
                className="h-12 w-12 items-center justify-center rounded-full bg-white shadow-md active:bg-gray-100"
                onPress={() =>
                  openInGoogleMaps(pickupCoords[1], pickupCoords[0])
                }
              >
                <Ionicons name="navigate" size={24} color="#3B82F6" />
              </TouchableOpacity>

              <TouchableOpacity
                className="h-12 w-12 items-center justify-center rounded-full bg-white shadow-md active:bg-gray-100"
                onPress={() =>
                  openInGoogleMaps(dropoffCoords[1], dropoffCoords[0])
                }
              >
                <MaterialCommunityIcons
                  name="navigation-variant"
                  size={24}
                  color="#EF4444"
                />
              </TouchableOpacity>

              <TouchableOpacity
                className="h-12 w-12 items-center justify-center rounded-full bg-white shadow-md active:bg-gray-100"
                onPress={() =>
                  Linking.openURL(`tel:${rideData.riders.users.phone}`)
                }
                accessibilityLabel="Call Passenger"
              >
                <Ionicons name="call" size={20} color="#3B82F6" />
              </TouchableOpacity>

              <TouchableOpacity
                className="h-12 w-12 items-center justify-center rounded-full bg-white shadow-md active:bg-gray-100"
                onPress={async () => {
                  await openWhatsApp(rideData.riders.users.phone);
                }}
                accessibilityLabel="WhatsApp Passenger"
              >
                <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Visual divider (optional) */}
          <View className="h-[1px] w-full bg-gray-200" />

          {/* Custom Slide to Confirm Button */}
          <View className="w-full">
            <View
              className="relative h-16 w-full border border-gray-200 shadow-sm"
              style={{ backgroundColor: getLightBgByRideStatus(rideStatus) }}
            >
              <GestureDetector gesture={panGesture}>
                <Animated.View
                  className="absolute left-0 z-10 rounded-full"
                  style={[
                    {
                      top: 0,
                      height: 54,
                      width: 54,
                      backgroundColor: getColorByRideStatus(rideStatus),
                    },
                    sliderStyle,
                  ]}
                >
                  <View className="h-full w-full items-center justify-center">
                    <Ionicons name="chevron-forward" size={24} color="white" />
                  </View>
                </Animated.View>
              </GestureDetector>
              <View className="absolute inset-0 items-center justify-center">
                <Text
                  className="ml-8 text-base font-semibold"
                  style={{ color: getColorByRideStatus(rideStatus) }}
                >
                  {rideStatus === 'driver_accepted'
                    ? 'Geser saat tiba di lokasi jemput'
                    : rideStatus === 'driver_arrived'
                      ? 'Geser untuk mulai antar penumpang'
                      : rideStatus === 'in_progress'
                        ? 'Geser saat tiba di tujuan'
                        : ''}
                </Text>
              </View>
            </View>
          </View>

          {/* Warnings */}
          <View className="rounded-b-2xl border border-yellow-200 bg-yellow-50 p-4 shadow-sm">
            <View className="flex-row items-start">
              <View className="-mt-0.5 mr-3">
                <Ionicons name="information-circle" size={20} color="#B45309" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-yellow-800">
                  Penting: Panduan Konfirmasi Perjalanan
                </Text>
                <View className="mt-2 space-y-1">
                  {rideStatus === 'driver_accepted' && (
                    <>
                      <View className="flex-row">
                        <Text className="mr-2 text-sm text-yellow-700">•</Text>
                        <Text className="flex-1 text-sm text-yellow-700">
                          Geser saat Anda sudah tiba di titik penjemputan.
                        </Text>
                      </View>
                      <View className="flex-row">
                        <Text className="mr-2 text-sm text-yellow-700">•</Text>
                        <Text className="flex-1 text-sm text-yellow-700">
                          Pastikan berada tepat di lokasi yang ditentukan oleh
                          sistem.
                        </Text>
                      </View>
                    </>
                  )}
                  {rideStatus === 'driver_arrived' && (
                    <>
                      <View className="flex-row">
                        <Text className="mr-2 text-sm text-yellow-700">•</Text>
                        <Text className="flex-1 text-sm text-yellow-700">
                          Geser untuk mulai mengantar penumpang.
                        </Text>
                      </View>
                      <View className="flex-row">
                        <Text className="mr-2 text-sm text-yellow-700">•</Text>
                        <Text className="flex-1 text-sm text-yellow-700">
                          Pastikan penumpang sudah masuk ke kendaraan sebelum
                          geser.
                        </Text>
                      </View>
                    </>
                  )}
                  {rideStatus === 'in_progress' && (
                    <>
                      <View className="flex-row">
                        <Text className="mr-2 text-sm text-yellow-700">•</Text>
                        <Text className="flex-1 text-sm text-yellow-700">
                          Geser saat Anda telah tiba di lokasi tujuan penumpang.
                        </Text>
                      </View>
                      <View className="flex-row">
                        <Text className="mr-2 text-sm text-yellow-700">•</Text>
                        <Text className="flex-1 text-sm text-yellow-700">
                          Pastikan penumpang telah turun sebelum menyelesaikan
                          perjalanan.
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Rider Info */}
          <View className="mt-4 w-full rounded-2xl border border-blue-100 bg-blue-50 px-8 py-4 shadow-sm">
            {/* Rider Info */}
            <Text className="mb-4 text-lg font-semibold text-gray-900">
              Informasi Penumpang
            </Text>
            <View className="mb-6 flex-row items-start justify-between gap-4">
              {rideData.riders
                ? renderRiderInfo(rideData.riders)
                : renderRiderSkeleton()}
            </View>

            {/* Trip Info */}
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

            {/* Earnings, Duration, Distance */}
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
          <View className="my-4 w-full rounded-2xl border border-blue-100 bg-blue-50 px-8 py-4 shadow-sm">
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
            className="mx-4 h-14 items-center justify-center rounded-xl bg-red-500"
            onPress={handleCancel}
            disabled={isCancelling}
          >
            {isCancelling ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator color="white" size="small" />
                <Text className="font-semibold text-white">Membatalkan...</Text>
              </View>
            ) : (
              <Text className="font-semibold text-white">
                Batalkan Perjalanan
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeView>
  );
}
