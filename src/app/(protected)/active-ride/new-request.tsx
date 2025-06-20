import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { confirmRideApi, rejectRideApi } from '@/api/ride';
import { type AvailabilityStatus } from '@/api/types/driver';
import { AuthContext } from '@/lib/auth';
import { webSocketService } from '@/lib/background/websocket-service';
import { SafeView } from '@/lib/safe-view';
import { useDriverStore } from '@/store';
import { type RideRequestData } from '@/types/ride-request';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type NewRideRequestParams = {
  data: string;
  pickupDistance: string;
  pickupDuration: string;
};

export default function NewRideRequest() {
  const { authData } = useContext(AuthContext);
  const router = useRouter();
  const params = useLocalSearchParams<NewRideRequestParams>();
  const [isLoading, setIsLoading] = useState(false);
  const { setAvailabilityStatus } = useDriverStore();

  if (!params.data) {
    router.back();
    return null;
  }

  const data: RideRequestData = JSON.parse(params.data);
  const pickupDistanceKm = parseFloat(params.pickupDistance);
  const pickupDurationSec = parseInt(params.pickupDuration, 10);

  const initialTimeLeft = Math.max(
    0,
    Math.ceil((data.request_expired_at - Date.now()) / 1000)
  );
  const [timeLeft, setTimeLeft] = useState(initialTimeLeft);
  const timerProgress = useSharedValue(1);

  const fareAfterPlatformFee = data.fare - data.platform_fee;
  const percentCommission =
    ((fareAfterPlatformFee - data.driver_earning) / fareAfterPlatformFee) * 100;

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Date.now();
      const remaining = Math.max(
        0,
        Math.ceil((data.request_expired_at - now) / 1000)
      );
      setTimeLeft(remaining);
      return remaining;
    };

    // Initial calculation
    const totalDuration = Math.ceil(
      (data.request_expired_at - Date.now()) / 1000
    );

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      if (remaining <= 0) {
        clearInterval(timer);
        router.back();
      }
    }, 1000);

    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, totalDuration * 1000 - elapsed);
      timerProgress.value = remaining / (totalDuration * 1000);
      if (remaining > 0) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);

    return () => clearInterval(timer);
  }, [data.request_expired_at]);

  const handleAccept = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const { error } = await confirmRideApi(authData!.session.access_token, {
        ride_id: data.ride_id,
        driver_id: authData!.driverId!,
      });

      if (!error) {
        // Navigate to ride details without passing data
        setAvailabilityStatus('en_route_to_pickup' as AvailabilityStatus);
        await webSocketService.sendLocationUpdate();
        router.replace('/active-ride/ride-details');
      } else {
        let message = 'Penumpang telah membatalkan perjalanan.';

        if (
          error === 'Ride has already been taken.' ||
          error?.includes('RIDE_ALREADY_TAKEN')
        ) {
          message = 'Perjalanan sudah diambil oleh driver lain.';
        }

        Alert.alert(
          'Gagal',
          message,
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ],
          { cancelable: false }
        );
      }
    } catch {
      Alert.alert(
        'Gagal',
        'Terjadi kesalahan saat mengkonfirmasi perjalanan.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ],
        { cancelable: false }
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const { error } = await rejectRideApi(authData!.session.access_token, {
        ride_id: data.ride_id,
        driver_id: authData!.driverId!,
      });

      if (error) {
        Alert.alert(
          'Gagal',
          'Terjadi kesalahan saat menolak perjalanan.',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ],
          { cancelable: false }
        );
      } else {
        router.back();
      }
    } catch {
      Alert.alert(
        'Gagal',
        'Terjadi kesalahan saat menolak perjalanan.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ],
        { cancelable: false }
      );
    } finally {
      setIsLoading(false);
    }
  };

  const timerStyle = useAnimatedStyle(() => ({
    width: interpolate(timerProgress.value, [0, 1], [0, SCREEN_WIDTH - 48]),
  }));

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
          <View className="items-center">
            <Text className="mb-1 text-xl font-bold text-white">
              Ada Penumpang Baru!
            </Text>
            <Text className="text-base text-white/80">
              Rp {data.driver_earning.toLocaleString('id-ID')} •{' '}
              {Math.round(data.duration_s / 60)} menit
            </Text>
          </View>
        </View>

        <ScrollView
          className="-mt-4 flex-1 rounded-t-3xl bg-white px-6 py-3"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {/* Countdown Timer */}
          <View className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <View className="items-center">
              <Text className="text-lg font-semibold text-gray-900">
                {timeLeft} detik tersisa
              </Text>
              <Text className="mt-1 text-sm text-gray-600">
                untuk menerima permintaan
              </Text>
              <View className="mt-4 h-2 w-full overflow-hidden rounded-full bg-blue-200">
                <Animated.View
                  className="h-full bg-blue-600"
                  style={timerStyle}
                />
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="mt-4 flex-row gap-4">
            <TouchableOpacity
              onPress={handleReject}
              disabled={isLoading}
              className={`flex-1 rounded-xl border border-red-200 bg-red-50 py-4 ${
                isLoading ? 'opacity-50' : ''
              }`}
            >
              {isLoading ? (
                <ActivityIndicator color="#DC2626" />
              ) : (
                <Text className="text-center font-medium text-red-600">
                  Tidak Terima
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAccept}
              disabled={isLoading}
              className={`flex-1 rounded-xl border border-green-200 bg-green-50 py-4 ${
                isLoading ? 'opacity-50' : ''
              }`}
            >
              {isLoading ? (
                <ActivityIndicator color="#059669" />
              ) : (
                <Text className="text-center font-medium text-green-600">
                  Terima
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Pickup Info */}
          <View className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <View className="flex-row items-center">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Ionicons name="location" size={24} color="#2563EB" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-lg font-semibold text-gray-900">
                  {pickupDistanceKm.toFixed(1)} km •{' '}
                  {Math.round(pickupDurationSec / 60)} menit
                </Text>
                <Text className="text-sm text-gray-600">
                  Jarak ke lokasi penjemputan
                </Text>
              </View>
            </View>
          </View>

          {/* Trip Details */}
          <View className="mt-8 w-full rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <Text className="mb-4 font-semibold text-gray-900">
              Detail Perjalanan
            </Text>

            <View className="space-y-1.5">
              <View className="flex-row">
                <View className="mt-1.5 h-2 w-2 rounded-full bg-blue-500" />
                <View className="flex-1 pl-3">
                  <Text className="text-sm font-medium text-gray-900">
                    {data.pickup.address}
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
                    {data.dropoff.address}
                  </Text>
                  <Text className="text-xs text-gray-500">Lokasi Tujuan</Text>
                </View>
              </View>
            </View>

            <View className="mt-4 flex-row justify-between border-t border-blue-200 pt-4">
              <View>
                <Text className="text-xl font-bold text-gray-900">
                  Rp {data.driver_earning.toLocaleString('id-ID')}
                </Text>
                <Text className="text-xs text-gray-500">
                  Estimasi Pendapatan
                </Text>
              </View>
              <View>
                <Text className="text-xl font-bold text-gray-900">
                  {Math.round(data.duration_s / 60)} min
                </Text>
                <Text className="text-xs text-gray-500">Durasi</Text>
              </View>
              <View>
                <Text className="text-xl font-bold text-gray-900">
                  {(data.distance_m / 1000).toFixed(1)} km
                </Text>
                <Text className="text-xs text-gray-500">Jarak</Text>
              </View>
            </View>
          </View>

          {/* Earnings Breakdown */}
          <View className="my-8 w-full rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <Text className="mb-4 font-semibold text-gray-900">
              Rincian Pendapatan
            </Text>

            <View className="space-y-3">
              <BreakdownItem label="Total Biaya" value={data.fare} />
              <BreakdownItem
                label="Biaya Platform"
                value={-data.platform_fee}
                isNegative
              />
              <BreakdownItem
                label="Setelah Biaya Platform"
                value={fareAfterPlatformFee}
                isDivider
              />
              <BreakdownItem
                label={`Komisi Aplikasi (${percentCommission.toFixed(1)}%)`}
                value={-data.app_commission}
                isNegative
              />
              <View className="mt-4 justify-between border-t border-blue-200 pt-4">
                <BreakdownItem
                  label="Total Pendapatan Driver"
                  value={data.driver_earning}
                  isBold
                />
              </View>
            </View>
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
