import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useContext, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

import { AuthContext } from '@/lib/auth';

type InputFieldProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  isSecure?: boolean;
  isLoading?: boolean;
  keyboardType?: 'email-address' | 'default';
};

// Reusable input field component with icon and label
function InputField({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  isSecure,
  isLoading,
  keyboardType = 'default',
}: InputFieldProps) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm text-gray-700">{label}</Text>
      <View className="flex-row items-center rounded-xl border border-gray-200 bg-gray-50">
        <View className="pl-4 pr-2">
          <Ionicons name={icon} size={20} color="#6B7280" />
        </View>
        <TextInput
          className="flex-1 px-2 py-3"
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isSecure}
          editable={!isLoading}
          keyboardType={keyboardType}
          autoCapitalize="none"
          placeholderTextColor="#9CA3AF"
        />
      </View>
    </View>
  );
}

// Divider component with "or" text
function Divider() {
  return (
    <View className="my-4 flex-row items-center justify-center">
      <View className="h-[1px] flex-1 bg-gray-200" />
      <Text className="mx-4 text-gray-500">atau</Text>
      <View className="h-[1px] flex-1 bg-gray-200" />
    </View>
  );
}

// App logo component with TripNus branding
function Logo() {
  return (
    <View>
      <View className="mt-6 items-center">
        <View className="flex-row items-center">
          <View className="mr-2 h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
            <Ionicons name="car" size={30} color="white" />
          </View>
          <Text className="text-2xl font-bold text-blue-600">TripNus</Text>
        </View>
      </View>
    </View>
  );
}

export default function Login() {
  const { logIn } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Handle login form submission
  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await logIn(email, password);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 justify-between">
        {/* Header Section */}
        <Logo />

        {/* Main Content */}
        <View className="px-6">
          {/* Title */}
          <View className="mb-8 items-center">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <Ionicons name="log-in" size={32} color="#2563EB" />
            </View>
            <Text className="mb-2 text-2xl font-bold text-gray-900">
              Selamat Datang Kembali
            </Text>
            <Text className="text-center text-base text-gray-600">
              Masuk ke akun Anda untuk mulai menerima order perjalanan.
            </Text>
          </View>

          {/* Login Form */}
          <View className="mx-2 space-y-4">
            <InputField
              label="Email"
              icon="mail"
              value={email}
              onChangeText={setEmail}
              placeholder="anda@email.com"
              isLoading={isLoading}
              keyboardType="email-address"
            />

            <InputField
              label="Kata Sandi"
              icon="lock-closed"
              value={password}
              onChangeText={setPassword}
              placeholder="Kata Sandi"
              isSecure
              isLoading={isLoading}
            />

            {/* Forgot Password Link */}
            <TouchableOpacity
              onPress={() => router.push('/forgot-password')}
              className="mb-4 items-end"
            >
              <Text className="text-sm font-medium text-blue-600">
                Lupa Kata Sandi?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View className="mx-2 mt-8 space-y-4">
            <TouchableOpacity
              className={`${
                isLoading ? 'bg-blue-300' : 'bg-blue-600'
              } mb-4 flex-row items-center justify-center rounded-xl py-4`}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Ionicons
                name="log-in"
                size={20}
                color="white"
                style={{ marginRight: 8 }}
              />
              <Text className="text-base font-semibold text-white">
                {isLoading ? 'Sedang Masuk...' : 'Masuk'}
              </Text>
            </TouchableOpacity>

            <Divider />

            {/* Register Link */}
            <TouchableOpacity
              className="items-center rounded-xl py-4"
              onPress={() => router.replace('/register')}
            >
              <Text className="text-base font-semibold text-blue-600">
                Buat akun baru
              </Text>
            </TouchableOpacity>
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
