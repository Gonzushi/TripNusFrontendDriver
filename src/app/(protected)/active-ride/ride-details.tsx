import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { AuthContext } from '@/lib/auth';
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

// Calculate distance between two points in meters
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

export default function RideDetails() {
  const { authData } = useContext(AuthContext);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [rideData, setRideData] = useState<RideData | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(
    null
  );
  const [locationPermission, setLocationPermission] = useState(false);
  const [isNearPickup, setIsNearPickup] = useState(false);

  const mapRef = useRef<MapView | null>(null);

  // Location permission and tracking setup
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Please enable location services to track your ride.',
          [{ text: 'OK' }]
        );
      }
    })();
  }, []);

  // Location tracking
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription;

    const startLocationTracking = async () => {
      if (!locationPermission) return;
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setDriverLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          (location) => {
            const newLocation = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };
            setDriverLocation(newLocation);

            // Update map region to follow driver
            if (mapRef.current) {
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
              const distance = calculateDistance(
                newLocation.latitude,
                newLocation.longitude,
                rideData.planned_pickup_coords.coordinates[1],
                rideData.planned_pickup_coords.coordinates[0]
              );
              setIsNearPickup(distance <= 75);
            }
          }
        );
      } catch (error) {
        console.error('Error getting location:', error);
        Alert.alert('Location Error', 'Failed to get your location.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    };

    startLocationTracking();
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [locationPermission, rideData]);

  // Fetch ride data
  useEffect(() => {
    const fetchRideData = async () => {
      if (!authData?.session.access_token || !authData?.driverId) return;

      try {
        const { data, error } = await getActiveRideByDriver(
          authData.session.access_token,
          authData.driverId
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

  // Initial map setup
  useEffect(() => {
    if (
      !mapRef.current ||
      !rideData?.planned_pickup_coords.coordinates ||
      !rideData?.planned_dropoff_coords.coordinates ||
      !driverLocation
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
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      }
    );
  }, [rideData, driverLocation]);

  const handlePickupPassenger = () => {
    // TODO: Implement pickup passenger logic
    console.log('Passenger picked up');
  };

  const handleCancelRide = () => {
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
            if (!authData?.session.access_token || !rideData) return;

            try {
              const { data, error } = await cancelRideByDriver(
                authData.session.access_token,
                rideData.id,
                authData.driverId!
              );

              console.log(data, error);

              if (error) {
                Alert.alert(
                  'Error',
                  'Gagal membatalkan perjalanan. Silakan coba lagi.'
                );
                return;
              }

              Alert.alert('Sukses', 'Perjalanan berhasil dibatalkan.', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error) {
              console.error('Error cancelling ride:', error);
              Alert.alert('Error', 'Terjadi kesalahan. Silakan coba lagi.');
            }
          },
        },
      ]
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
      isShowingPaddingTop
      statusBarStyle="light"
      statusBackgroundColor="bg-blue-600"
    >
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="-mb-4 bg-blue-600 px-4 pb-16 pt-4">
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
              <Text className="text-base text-white/80">
                Rp {rideData.driver_earning.toLocaleString('id-ID')} •{' '}
                {Math.round(rideData.duration_s / 60)} menit
              </Text>
            </View>
            <View className="w-10" />
          </View>
        </View>

        <ScrollView
          className="-mt-4 flex-1 rounded-t-3xl bg-white px-6 py-3"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Map */}
          <View className="mt-5 h-[50vh] w-full overflow-hidden rounded-2xl border border-blue-300 shadow-sm">
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
            <View className="absolute bottom-4 right-4 gap-2 space-y-3">
              <TouchableOpacity
                className="h-12 w-12 items-center justify-center rounded-full bg-white shadow-md active:bg-gray-100"
                onPress={() => {
                  if (mapRef.current && driverLocation) {
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
                onPress={() => {
                  if (mapRef.current && driverLocation) {
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
                          top: 70,
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
            </View>
          </View>

          {/* Driver Navigation Buttons */}
          <View className="mt-4 flex-row justify-between gap-3">
            <TouchableOpacity
              className="flex-1 items-center justify-center rounded-xl bg-blue-500 px-4 py-3 shadow-sm active:bg-blue-600"
              onPress={() => openInGoogleMaps(pickupCoords[1], pickupCoords[0])}
            >
              <Text className="font-semibold text-white">Lokasi Jemput</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 items-center justify-center rounded-xl bg-red-500 px-4 py-3 shadow-sm active:bg-red-600"
              onPress={() =>
                openInGoogleMaps(dropoffCoords[1], dropoffCoords[0])
              }
            >
              <Text className="font-semibold text-white">Lokasi Tujuan</Text>
            </TouchableOpacity>
          </View>

          {/* Pickup Button */}
          <TouchableOpacity
            className={`mt-4 w-full items-center justify-center rounded-xl px-4 py-3 shadow-sm ${
              isNearPickup ? 'bg-green-500 active:bg-green-600' : 'bg-gray-300'
            }`}
            onPress={handlePickupPassenger}
            disabled={!isNearPickup}
          >
            <Text className="font-semibold text-white">Penumpang Dijemput</Text>
          </TouchableOpacity>

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
                label="Biaya Platform"
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
              <BreakdownItem
                label="Total Pendapatan Driver"
                value={rideData.driver_earning}
                isBold
              />
            </View>
          </View>

          {/* Cancel Ride Button */}
          <TouchableOpacity
            className="mb-4 w-full items-center justify-center rounded-xl bg-red-500 px-4 py-3 shadow-sm active:bg-red-600"
            onPress={handleCancelRide}
          >
            <Text className="font-semibold text-white">
              Batalkan Perjalanan
            </Text>
          </TouchableOpacity>
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
