import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useContext, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';

import { AuthContext } from '@/lib/auth';
import { createDriverProfileApi } from '@/lib/driver/api';

// Logo component with TripNus branding
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

// Document requirement list component
function DocumentRequirements() {
  const requirements = [
    'KTP (Kartu Tanda Penduduk)',
    'SIM (Surat Izin Mengemudi)',
    'STNK Kendaraan',
  ];

  return (
    <View className="mt-6 rounded-xl bg-blue-50 p-4">
      <Text className="mb-3 text-base font-semibold text-gray-700">
        Dokumen yang perlu disiapkan:
      </Text>
      {requirements.map((item, index) => (
        <View key={index} className="mb-2 flex-row items-center">
          <Ionicons name="document-text" size={20} color="#2563EB" />
          <Text className="ml-2 text-base text-gray-600">{item}</Text>
        </View>
      ))}
    </View>
  );
}

// Header component with welcome message
function Header() {
  return (
    <View className="mb-4 items-center">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-blue-100">
        <Ionicons name="car" size={32} color="#2563EB" />
      </View>
      <Text className="mb-2 text-2xl font-bold text-gray-900">
        Selamat Bergabung di TripNus!
      </Text>
      <Text className="text-center text-base text-gray-600">
        Untuk melanjutkan proses pendaftaran sebagai mitra driver, kami
        memerlukan beberapa dokumen untuk verifikasi identitas Anda.
      </Text>
    </View>
  );
}

export default function ProfileSetup2() {
  const [isLoading, setIsLoading] = useState(false);
  const { authData, setAuthData, logOut } = useContext(AuthContext);
  const router = useRouter();

  const handleError = useCallback(
    async (error: Error | unknown) => {
      console.error('Profile setup error:', error);
      setIsLoading(false);

      Alert.alert(
        'Gagal Membuat Profil',
        'Terjadi kesalahan saat membuat profil driver. Silakan coba lagi.',
        [
          {
            text: 'Kembali',
            onPress: () => {
              logOut().then(() => {
                router.replace('/profile-setup-2');
              });
            },
          },
          {
            text: 'Coba Lagi',
            style: 'default',
          },
        ]
      );
    },
    [logOut, router]
  );

  const handleContinue = useCallback(async () => {
    if (!authData?.session.access_token) {
      Alert.alert('Error', 'Sesi Anda telah berakhir. Silakan login kembali.');
      logOut().then(() => {
        router.replace('/welcome');
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await createDriverProfileApi(
        authData.session.access_token
      );

      if (response) {
        await setAuthData({
          ...authData,
          driverId: response.data.id,
        });
        // Use replace instead of push to avoid navigation stack issues
        router.replace('/profile-setup-2');
      } else {
        throw new Error('Failed to create driver profile');
      }
    } catch (error) {
      handleError(error);
    }
  }, [authData, setAuthData, logOut, router, handleError]);

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 justify-between">
        <View>
          <Logo />
        </View>

        <View className="px-6">
          <Header />
          <DocumentRequirements />

          <View className="mx-2 mt-8 space-y-4">
            <TouchableOpacity
              className={`${
                isLoading ? 'bg-blue-300' : 'bg-blue-600'
              } mb-4 flex-row items-center justify-center rounded-xl py-4`}
              onPress={handleContinue}
              disabled={isLoading}
            >
              {isLoading ? (
                <View className="flex-row items-center">
                  <Ionicons
                    name="reload"
                    size={20}
                    color="white"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-base font-semibold text-white">
                    Memproses...
                  </Text>
                </View>
              ) : (
                <View className="flex-row items-center">
                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color="white"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-base font-semibold text-white">
                    Lanjutkan Pendaftaran
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View>
          <Text className="mb-4 px-6 text-center text-sm text-gray-500">
            Dengan melanjutkan, Anda menyetujui Syarat dan Ketentuan kami
          </Text>
        </View>
      </View>
    </View>
  );
}
