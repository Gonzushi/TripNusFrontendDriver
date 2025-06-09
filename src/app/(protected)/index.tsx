import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useContext, useEffect, useState } from 'react';
import {
  Image,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { AuthContext } from '@/lib/auth';
import { useDriverStore } from '@/lib/driver/store';
import NotificationDebug from '@/lib/notification/notification-debug';
import { getProfilePictureUri } from '@/lib/profile-picture';
import { SafeView } from '@/lib/safe-view';

// Wallet balance component
function WalletBalance({ balance }: { balance: number }) {
  return (
    <View className="mb-4 px-4">
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
}: {
  isOnline: boolean;
  onToggle: () => void;
  isDisabled: boolean;
}) {
  return (
    <View className="mt-4">
      <View className="px-4">
        <TouchableOpacity
          onPress={onToggle}
          disabled={isDisabled}
          className={`flex-row items-center justify-center rounded-xl py-4 ${
            isDisabled ? 'bg-gray-300' : isOnline ? 'bg-red-500' : 'bg-blue-600'
          }`}
        >
          <Ionicons
            name={isOnline ? 'power' : 'power-outline'}
            size={20}
            color="white"
            className="mr-2"
          />
          <Text className="ml-2 text-base font-semibold text-white">
            {isOnline ? 'Berhenti Menerima Order' : 'Mulai Menerima Order'}
          </Text>
        </TouchableOpacity>
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
                  uri: `${profilePictureUri}?timestamp=${Date.now()}`,
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
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  value: string;
  label: string;
}) {
  return (
    <View
      className={`w-[31%] rounded-2xl border ${borderColor} ${bgColor} shadow-sm`}
    >
      <View className="px-3 py-4">
        <View
          className={`mb-3 h-11 w-11 items-center justify-center rounded-full ${
            bgColor.replace('bg-', 'bg-') + '/90'
          }`}
        >
          <Ionicons name={icon} size={28} color={iconColor} />
        </View>
        <View>
          <Text className="text-2xl font-bold text-gray-800">{value}</Text>
          <Text className="mt-1 text-[13px] text-gray-600">{label}</Text>
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
        />
        <StatCard
          icon="map"
          iconColor="#8B5CF6"
          bgColor="bg-purple-50"
          borderColor="border-purple-100"
          value="13 km"
          label="Jarak Rata-rata"
        />
        <StatCard
          icon="star"
          iconColor="#EAB308"
          bgColor="bg-yellow-50"
          borderColor="border-yellow-100"
          value="4.9"
          label="Penilaian"
        />
      </View>
    </View>
  );
}

// Community support section component
function CommunitySupport({ onShare }: { onShare: () => void }) {
  return (
    <View className="px-4">
      <View className="rounded-xl border border-blue-100/50 bg-blue-50/50 p-5">
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
  const { isOnline, walletBalance, setOnline } = useDriverStore();

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
  const handleToggleOnline = () => {
    setOnline(!isOnline);
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
          firstName={authData?.firstName || 'Teman'}
          profilePictureUri={profilePictureUri}
          onProfilePress={handleProfilePress}
          isOnline={isOnline}
        />

        <WalletBalance balance={walletBalance} />

        <StatsSection />

        <OnlineStatusToggle
          isOnline={isOnline}
          onToggle={handleToggleOnline}
          isDisabled={walletBalance < 0}
        />

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

        <NotificationDebug />

        <View className="h-8" />
      </ScrollView>
    </SafeView>
  );
}
