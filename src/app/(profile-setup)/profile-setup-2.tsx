import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { updatePhoneApi } from '@/api/auth';
import { updateDriverProfileApi } from '@/api/driver';
import { AuthContext } from '@/lib/auth';
import { type ProfileFormData } from '@/types/profile-setup';
import { validateProfileForm } from '@/utils/profile-setup';

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

// Header component
function Header() {
  return (
    <View className="mb-8 items-center">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-blue-100">
        <Ionicons name="person" size={32} color="#2563EB" />
      </View>
      <Text className="mb-2 text-2xl font-bold text-gray-900">
        Lengkapi Profil Anda
      </Text>
      <Text className="text-center text-base text-gray-600">
        Silakan isi nama Anda untuk melanjutkan menggunakan TripNus
      </Text>
    </View>
  );
}

// Form input component
function FormInput({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  isRequired = false,
  isLoading = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  prefix,
  hint,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  isRequired?: boolean;
  isLoading?: boolean;
  keyboardType?: 'default' | 'phone-pad';
  autoCapitalize?: 'none' | 'words';
  prefix?: string;
  hint?: string;
}) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm text-gray-700">
        {label} {isRequired && '*'}
      </Text>
      <View className="flex-row items-center rounded-xl border border-gray-200 bg-gray-50">
        <View className="pl-4 pr-2">
          <Ionicons name={icon} size={20} color="#6B7280" />
        </View>
        <View className="flex-1 flex-row items-center">
          {prefix && <Text className="pl-2 text-gray-900">{prefix}</Text>}
          <TextInput
            className="flex-1 px-2 py-3"
            placeholder={placeholder}
            value={prefix ? value.replace(prefix, '') : value}
            onChangeText={(text) => {
              if (keyboardType === 'phone-pad') {
                // Only allow numbers for phone input
                const numbersOnly = text.replace(/[^0-9]/g, '');
                onChangeText(prefix ? prefix + numbersOnly : numbersOnly);
              } else {
                onChangeText(text);
              }
            }}
            keyboardType={keyboardType}
            editable={!isLoading}
            autoCapitalize={autoCapitalize}
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>
      {hint && <Text className="mt-1 text-xs text-gray-500">{hint}</Text>}
    </View>
  );
}

// Submit button component
function SubmitButton({
  onPress,
  isLoading,
}: {
  onPress: () => void;
  isLoading: boolean;
}) {
  return (
    <TouchableOpacity
      className={`${
        isLoading ? 'bg-blue-300' : 'bg-blue-600'
      } mb-4 flex-row items-center justify-center rounded-xl py-4`}
      onPress={onPress}
      disabled={isLoading}
    >
      <Ionicons
        name="arrow-forward"
        size={20}
        color="white"
        style={{ marginRight: 8 }}
      />
      <Text className="text-base font-semibold text-white">
        {isLoading ? 'Menyiapkan...' : 'Lanjutkan'}
      </Text>
    </TouchableOpacity>
  );
}

export default function ProfileSetup() {
  // State
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    phoneNumber: '+62',
  });
  const [isLoading, setIsLoading] = useState(false);

  // Hooks
  const { authData, setAuthData, logOut } = useContext(AuthContext);
  const router = useRouter();

  // Effects
  useEffect(() => {
    if (
      authData?.driverFirstName &&
      authData?.driverLastName &&
      authData?.phone
    ) {
      router.replace('/profile-setup-3');
    }
  }, [authData]);

  // Event Handlers
  const handleError = async (error: Error) => {
    Alert.alert('Error', error.message);
    if (error.message.includes('token')) {
      await logOut();
      router.replace('/welcome');
    }
  };

  const handleSubmit = async () => {
    const validationError = validateProfileForm(formData);
    if (validationError) {
      Alert.alert('Error', validationError);
      return;
    }

    setIsLoading(true);
    try {
      if (!authData?.session.access_token) {
        throw new Error('Token tidak valid');
      }

      // Update profile
      const { error: profileError } = await updateDriverProfileApi(
        authData.session.access_token,
        {
          first_name: formData.firstName,
          last_name: formData.lastName,
        }
      );

      if (profileError) {
        throw new Error(profileError || 'Gagal memperbarui profil');
      }

      // Update phone number
      const { error: phoneError } = await updatePhoneApi(
        authData.session.access_token,
        formData.phoneNumber
      );

      if (phoneError) {
        throw new Error(phoneError || 'Gagal memperbarui nomor telepon');
      }

      // Update auth data with both profile and phone updates
      const updatedAuthData = {
        ...authData,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim() || null,
        phone: formData.phoneNumber.trim(),
      };
      await setAuthData(updatedAuthData);
      router.replace('/profile-setup-3');
    } catch (error) {
      await handleError(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 justify-between">
        {/* Header Section */}
        <View>
          <Logo />
        </View>

        {/* Main Content */}
        <View className="px-6">
          <Header />

          {/* Form */}
          <View className="mx-2 space-y-4">
            <FormInput
              label="Nama Depan"
              icon="person"
              value={formData.firstName}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, firstName: text }))
              }
              placeholder="Masukkan nama depan Anda"
              isRequired
              isLoading={isLoading}
              autoCapitalize="words"
            />

            <FormInput
              label="Nama Belakang"
              icon="person-outline"
              value={formData.lastName}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, lastName: text }))
              }
              placeholder="Masukkan nama belakang Anda"
              isRequired
              isLoading={isLoading}
              autoCapitalize="words"
            />

            <FormInput
              label="Nomor Telepon"
              icon="call"
              value={formData.phoneNumber}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, phoneNumber: text }))
              }
              placeholder="812XXXXXXXX"
              isRequired
              isLoading={isLoading}
              keyboardType="phone-pad"
              prefix="+62"
              hint="Format: +62812XXXXXXXX"
            />
          </View>

          {/* Action Buttons */}
          <View className="mx-2 mt-8 space-y-4">
            <SubmitButton onPress={handleSubmit} isLoading={isLoading} />
          </View>
        </View>

        {/* Terms and Conditions */}
        <View>
          <Text className="mb-4 px-6 text-center text-sm text-gray-500">
            Dengan melanjutkan, Anda menyetujui Syarat dan Ketentuan kami
          </Text>
        </View>
      </View>
    </View>
  );
}
