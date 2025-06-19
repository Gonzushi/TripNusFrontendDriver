import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useContext, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';

import { updateDriverProfileApi } from '@/api/driver';
import { AuthContext } from '@/lib/auth';

const DEBUG_MODE = false;
// Logo component
function Logo() {
  return (
    <View className="mt-6 items-center">
      <View className="flex-row items-center">
        <View className="mr-2 h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
          <Ionicons name="car" size={30} color="white" />
        </View>
        <Text className="text-2xl font-bold text-blue-600">TripNus</Text>
      </View>
    </View>
  );
}

// Header component for submitted status
function SubmittedHeader() {
  return (
    <View className="mb-8 items-center">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-blue-100">
        <Ionicons name="time" size={32} color="#2563EB" />
      </View>
      <Text className="mb-2 text-2xl font-bold text-gray-900">
        Pendaftaran Sedang Diproses
      </Text>
      <Text className="text-center text-base text-gray-600">
        Mohon tunggu 2-3 hari kerja untuk proses verifikasi data Anda. Kami akan
        menghubungi Anda melalui email atau nomor telepon yang terdaftar.
      </Text>
    </View>
  );
}

// Header component for rejected status
function RejectedHeader() {
  return (
    <View className="mb-8 items-center">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-red-100">
        <Ionicons name="alert-circle" size={32} color="#DC2626" />
      </View>
      <Text className="mb-2 text-2xl font-bold text-gray-900">
        Pendaftaran Ditolak
      </Text>
      <Text className="text-center text-base text-gray-600">
        Mohon maaf, pendaftaran Anda tidak dapat disetujui. Silakan periksa
        catatan di bawah dan daftar ulang.
      </Text>
    </View>
  );
}

// Header component for approved status
function ApprovedHeader() {
  return (
    <View className="mb-8 items-center">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-blue-100">
        <Ionicons name="checkmark-circle" size={32} color="#2563EB" />
      </View>
      <Text className="mb-2 text-2xl font-bold text-gray-900">
        Selamat! Pendaftaran Disetujui
      </Text>
      <Text className="text-center text-base text-gray-600">
        Anda telah resmi menjadi mitra driver TripNus. Silakan mulai menerima
        orderan dengan menekan tombol di bawah.
      </Text>
    </View>
  );
}

// Notes component for rejected status
function RejectionNotes({ notes }: { notes: string }) {
  return (
    <View className="mb-8 rounded-xl bg-red-50 p-4">
      <Text className="mb-2 text-base font-semibold text-gray-700">
        Catatan dari Admin:
      </Text>
      <Text className="text-base text-gray-600">{notes}</Text>
    </View>
  );
}

// Action button component
function ActionButton({
  onPress,
  icon,
  text,
  color = 'bg-blue-600',
}: {
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  color?: string;
}) {
  return (
    <TouchableOpacity
      className={`mb-4 flex-row items-center justify-center rounded-xl py-4 ${color}`}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={20}
        color="white"
        style={{ marginRight: 8 }}
      />
      <Text className="text-base font-semibold text-white">{text}</Text>
    </TouchableOpacity>
  );
}

// Helper function to format the date
function formatLastUpdate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // Format the exact time
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const exactTime = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

  let relativeTime = '';
  // If less than a minute
  if (diff < 60000) {
    relativeTime = 'Baru saja diperbarui';
  }
  // If less than an hour
  else if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    relativeTime = `Diperbarui ${minutes} menit yang lalu`;
  }
  // If less than a day
  else if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    relativeTime = `Diperbarui ${hours} jam yang lalu`;
  }
  // If more than a day
  else {
    const days = Math.floor(diff / 86400000);
    relativeTime = `Diperbarui ${days} hari yang lalu`;
  }

  return `${relativeTime}\n${exactTime} WIB`;
}

export default function ProfileSetup4() {
  const { authData, setAuthData, refreshToken } = useContext(AuthContext);
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isConfirming, setIsConfirming] = useState(false);

  const handleRefresh = async () => {
    if (!authData || isRefreshing) return;

    setIsRefreshing(true);
    try {
      // Add artificial delay
      const [newData] = await Promise.all([
        refreshToken(authData),
        new Promise((resolve) => setTimeout(resolve, 2000)), // 2 second delay
      ]);

      if (newData) {
        await setAuthData(newData);
        console.log('newData', newData.driverStatus);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleConfirmation = async () => {
    if (!authData || isConfirming) return;

    setIsConfirming(true);
    try {
      const { error: updateError } = await updateDriverProfileApi(
        authData.session.access_token,
        {
          status: 'confirmed',
        }
      );

      if (!updateError) {
        await setAuthData({
          ...authData,
          driverStatus: 'confirmed',
        });
        router.replace('/');
      } else {
        Alert.alert('Error', 'Gagal mengonfirmasi status. Silakan coba lagi.');
      }
    } catch (error) {
      console.error('Error confirming status:', error);
      Alert.alert('Error', 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsConfirming(false);
    }
  };

  // Early return for loading state
  if (!authData) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Ionicons name="reload" size={32} color="#2563EB" />
        <Text className="mt-4 text-gray-600">Memuat...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 justify-between">
        <View>
          <Logo />
        </View>

        <View className="px-6">
          {/* Show different headers based on driver status */}
          {authData.driverStatus === 'submitted' && (
            <View className="mx-2 mt-8 space-y-2">
              <SubmittedHeader />
              <ActionButton
                onPress={handleRefresh}
                icon="refresh"
                text={
                  isRefreshing ? 'Memperbarui Status...' : 'Perbarui Status'
                }
                color={isRefreshing ? 'bg-blue-400' : 'bg-blue-600'}
              />
              <Text className="whitespace-pre-line text-center text-sm text-gray-500">
                {formatLastUpdate(lastUpdate)}
              </Text>
            </View>
          )}
          {authData.driverStatus === 'approved' && <ApprovedHeader />}
          {authData.driverStatus !== 'submitted' &&
            authData.driverStatus !== 'approved' && (
              <>
                <RejectedHeader />
                {authData.driverNotes && (
                  <RejectionNotes notes={authData.driverNotes} />
                )}
              </>
            )}

          {/* Show action buttons based on driver status */}
          <View className="mx-2 mt-8 space-y-4">
            {authData.driverStatus === 'approved' && (
              <ActionButton
                onPress={handleConfirmation}
                icon="checkmark"
                text={isConfirming ? 'Memproses...' : 'Mulai Menerima Order'}
                color={isConfirming ? 'bg-blue-400' : 'bg-blue-600'}
              />
            )}
            {authData.driverStatus !== 'submitted' &&
              authData.driverStatus !== 'approved' && (
                <ActionButton
                  onPress={() => router.replace('/profile-setup-2')}
                  icon="refresh"
                  text="Daftar Ulang"
                  color="bg-blue-600"
                />
              )}
          </View>
        </View>

        {DEBUG_MODE && (
          <View className="mx-2 mt-8 space-y-2">
            <ActionButton
              onPress={handleRefresh}
              icon="refresh"
              text={isRefreshing ? 'Memperbarui Status...' : 'Perbarui Status'}
              color={isRefreshing ? 'bg-blue-400' : 'bg-blue-600'}
            />
            <Text className="whitespace-pre-line text-center text-sm text-gray-500">
              {formatLastUpdate(lastUpdate)}
            </Text>
          </View>
        )}

        <View>
          <Text className="mb-4 px-6 text-center text-sm text-gray-500">
            Butuh bantuan? Hubungi tim support kami
          </Text>
        </View>
      </View>
    </View>
  );
}
