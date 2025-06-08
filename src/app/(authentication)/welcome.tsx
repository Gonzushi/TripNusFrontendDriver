import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

type AuthRoutes = '/(authentication)/login' | '/(authentication)/register';

export default function Welcome() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Reset loading state when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setIsLoading(false);
    }, [])
  );

  const handleNavigation = (route: AuthRoutes) => {
    if (isLoading) return;
    setIsLoading(true);
    router.push(route);
  };

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 px-6">
        {/* Main Content */}
        <View className="flex-1 items-center justify-center">
          {/* Logo Section */}
          <View className="mb-8 items-center">
            <View className="flex-row items-center">
              <View className="mr-2 h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
                <Ionicons name="car" size={30} color="white" />
              </View>
              <Text className="text-2xl font-bold text-blue-600">TripNus</Text>
            </View>
          </View>

          {/* Illustration */}
          <View className="items-center">
            <Image
              source={{
                uri: 'https://placehold.co/400x400/4F46E5/ffffff?text=City+Traffic',
              }}
              className="aspect-square w-full"
              contentFit="contain"
            />
          </View>

          {/* Text Content */}
          <View className="mt-8 items-center">
            <Text className="mb-4 text-center text-3xl font-bold text-gray-900">
              Bergabung Sebagai Mitra Driver
            </Text>
            <Text className="text-center text-base text-gray-600">
              Dapatkan penghasilan tambahan dengan jadwal fleksibel. Jadilah
              bagian dari revolusi transportasi Indonesia!
            </Text>
          </View>
        </View>

        {/* Bottom Section */}
        <View className="mb-4 space-y-8">
          {/* Buttons */}
          <View className="space-y-6">
            <TouchableOpacity
              className={`mb-6 items-center rounded-xl border border-blue-600 py-4 ${
                isLoading ? 'opacity-50' : ''
              }`}
              onPress={() => handleNavigation('/(authentication)/register')}
              disabled={isLoading}
            >
              <Text className="text-base font-semibold text-blue-600">
                Daftar sebagai Driver
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`mb-16 items-center rounded-xl bg-blue-600 py-4 ${
                isLoading ? 'opacity-50' : ''
              }`}
              onPress={() => handleNavigation('/(authentication)/login')}
              disabled={isLoading}
            >
              <Text className="text-base font-semibold text-white">
                Masuk ke akun Driver
              </Text>
            </TouchableOpacity>
          </View>

          {/* Terms */}
          <Text className="text-center text-sm text-gray-500">
            Dengan melanjutkan, Anda menyetujui Syarat dan Ketentuan serta
            Kebijakan Privasi kami
          </Text>
        </View>
      </View>
    </View>
  );
}
