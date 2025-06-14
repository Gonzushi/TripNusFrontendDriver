import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { AuthContext } from '@/lib/auth';
import {
  getProfilePictureUri,
  updateProfilePicture,
} from '@/lib/profile-picture';
import { SafeView } from '@/lib/safe-view';

// Header component with back button
function Header({ onBack }: { onBack: () => void }) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3">
      <TouchableOpacity onPress={onBack}>
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
      <Text className="text-lg font-semibold text-white">Profil</Text>
      <View style={{ width: 24 }} />
    </View>
  );
}

// Profile Picture Component
function ProfilePicture({
  uri,
  imageKey,
  uploading,
  onUpdate,
}: {
  uri: string | null;
  imageKey: number;
  uploading: boolean;
  onUpdate: () => void;
}) {
  return (
    <View className="relative">
      <View className="h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-white/20">
        {uri ? (
          <Image
            key={imageKey}
            source={{
              uri: `${uri}?timestamp=${Date.now()}`,
              cache: 'reload',
            }}
            className="h-full w-full"
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="person" size={72} color="white" />
        )}
      </View>
      <TouchableOpacity
        className="absolute bottom-0 right-0 rounded-full bg-white p-2 shadow"
        onPress={onUpdate}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator size="small" color="#3B82F6" />
        ) : (
          <MaterialCommunityIcons name="pencil" size={18} color="#3B82F6" />
        )}
      </TouchableOpacity>
    </View>
  );
}

// Contact Info Component
function ContactInfo({ email, phone }: { email: string; phone: string }) {
  return (
    <View className="mt-3 w-full px-4">
      <View className="flex-row flex-wrap items-center justify-center gap-3">
        <View className="flex-shrink flex-row items-center rounded-full bg-white/10 px-4 py-2">
          <Ionicons name="mail-outline" size={16} color="white" />
          <Text
            className="ml-2 flex-shrink text-base text-white/90"
            numberOfLines={1}
          >
            {email}
          </Text>
        </View>
        <View className="flex-row items-center rounded-full bg-white/10 px-4 py-2">
          <Ionicons name="call-outline" size={16} color="white" />
          <Text className="ml-2 text-base text-white/90">+{phone}</Text>
        </View>
      </View>
    </View>
  );
}

// Menu Item Component
function MenuItem({
  icon,
  iconColor,
  bgColor,
  title,
  subtitle,
  onPress,
  loading,
  textColor = 'text-gray-900',
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  bgColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  loading?: boolean;
  textColor?: string;
}) {
  return (
    <TouchableOpacity
      className="mb-3 flex-row items-center rounded-xl border border-gray-100 bg-white p-4 shadow-sm active:bg-gray-50"
      onPress={onPress}
      disabled={loading}
    >
      <View
        className={`h-11 w-11 ${bgColor} items-center justify-center rounded-full`}
      >
        {loading ? (
          <ActivityIndicator size="small" color={iconColor} />
        ) : (
          <MaterialCommunityIcons name={icon} size={24} color={iconColor} />
        )}
      </View>
      <View className="ml-3 flex-1">
        <Text className={`${textColor} text-base font-medium`}>{title}</Text>
        <Text className="text-sm text-gray-500">{subtitle}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

export default function Profile() {
  const authState = useContext(AuthContext);
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [profilePictureUri, setProfilePictureUri] = useState<string | null>(
    null
  );
  const [imageKey, setImageKey] = useState(0);

  const refreshProfilePicture = async () => {
    if (!authState?.authData?.user.id) return;

    const uri = await getProfilePictureUri(authState.authData.user.id);
    setProfilePictureUri(uri);
    requestAnimationFrame(() => setImageKey((prev) => prev + 1));
  };

  useEffect(() => {
    refreshProfilePicture();
  }, [authState?.authData?.user.id]);

  const handleLogout = async () => {
    if (!authState?.logOut) return;

    setIsSigningOut(true);
    try {
      await authState.logOut();
      router.replace('/welcome');
    } catch (error: unknown) {
      Alert.alert(
        'Kesalahan',
        error instanceof Error
          ? error.message
          : 'Gagal keluar. Silakan coba lagi.'
      );
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleProfilePictureUpdate = async () => {
    if (
      !authState?.authData?.session?.access_token ||
      !authState.authData.user.id
    ) {
      Alert.alert('Kesalahan', 'Tidak terautentikasi');
      return;
    }
    
    setUploading(true);
    try {
      const result = await updateProfilePicture(
        authState.authData.session.access_token,
        authState.authData.user.id
      );

      if (result.success) {
        Alert.alert(
          'Sukses',
          'Foto profil berhasil diperbarui. Silakan keluar dan masuk kembali untuk melihat perubahan.',
          [
            {
              text: 'OK',
              onPress: () => {
                router.replace('/login');
              },
            },
          ]
        );
      } else if (result.error) {
        Alert.alert('Kesalahan', result.error);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleHelpSupport = async () => {
    const phoneNumber = '6285110600497'; // Remove any special characters
    const message =
      'Halo, saya membutuhkan bantuan untuk aplikasi TripNus Rider.\n\nNama: ' +
      `${authState.authData?.driverFirstName} ${authState.authData?.driverLastName}\n` +
      `Email: ${authState.authData?.user.email}\n` +
      'Masalah: '; // Leave space for user to describe their issue

    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;

    try {
      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'Kesalahan',
          'WhatsApp tidak terinstall di perangkat Anda. Silakan install WhatsApp terlebih dahulu.'
        );
      }
    } catch (err: unknown) {
      console.error('Error opening WhatsApp:', err);
      Alert.alert(
        'Kesalahan',
        'Tidak dapat membuka WhatsApp. Silakan coba lagi nanti.'
      );
    }
  };

  if (!authState?.authData?.session) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="mt-4 text-gray-600">Memuat...</Text>
      </View>
    );
  }

  return (
    <SafeView statusBackgroundColor="bg-blue-600" statusBarStyle="light">
      <View className="flex-1 bg-blue-600">
        <Header onBack={() => router.back()} />

        {/* Profile Header */}
        <View className="items-center pb-10 pt-8">
          <ProfilePicture
            uri={profilePictureUri}
            imageKey={imageKey}
            uploading={uploading}
            onUpdate={handleProfilePictureUpdate}
          />
          <Text className="mt-4 text-2xl font-semibold text-white">
            {authState.authData.driverFirstName} {authState.authData.driverLastName}
          </Text>

          <ContactInfo
            email={authState.authData.user.email}
            phone={authState.authData.phone!}
          />
        </View>

        {/* Menu Options */}
        <View className="flex-1 rounded-t-3xl bg-white">
          <ScrollView className="flex-1 pt-4">
            <View className="px-4">
              <MenuItem
                icon="account-outline"
                iconColor="#3B82F6"
                bgColor="bg-blue-100"
                title="Informasi Pribadi"
                subtitle="Perbarui detail Anda"
                onPress={() => router.push('/profile/personal-information')}
              />
              <MenuItem
                icon="help-circle-outline"
                iconColor="#8B5CF6"
                bgColor="bg-purple-100"
                title="Bantuan & Dukungan"
                subtitle="Hubungi kami via WhatsApp"
                onPress={handleHelpSupport}
              />
              <MenuItem
                icon="logout"
                iconColor="#EF4444"
                bgColor="bg-red-100"
                title={isSigningOut ? 'Sedang Keluar...' : 'Keluar'}
                subtitle={isSigningOut ? 'Mohon tunggu...' : 'Keluar dari akun'}
                onPress={handleLogout}
                loading={isSigningOut}
                textColor="text-red-500"
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </SafeView>
  );
}
