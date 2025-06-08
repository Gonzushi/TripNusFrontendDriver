import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useContext, useEffect, useState } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AuthContext } from '@/lib/auth';

type PasswordRequirement = {
  label: string;
  regex: RegExp;
  met: boolean;
};

// Define password validation rules with Indonesian labels
const PASSWORD_REQUIREMENTS: Omit<PasswordRequirement, 'met'>[] = [
  {
    label: 'Minimal 6 karakter',
    regex: /^.{6,}$/,
  },
  {
    label: 'Mengandung huruf kecil (a-z)',
    regex: /[a-z]/,
  },
  {
    label: 'Mengandung huruf besar (A-Z)',
    regex: /[A-Z]/,
  },
  {
    label: 'Mengandung angka (0-9)',
    regex: /[0-9]/,
  },
  {
    label: 'Mengandung karakter khusus (!@#$%^&*)',
    regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?`~]/,
  },
];

// App logo component with TripNus branding
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

// Registration page header with title and subtitle
function Header() {
  return (
    <View className="mb-8 items-center">
      <View className="mb-4 mt-12 h-16 w-16 items-center justify-center rounded-full bg-blue-100">
        <Ionicons name="person-add" size={32} color="#2563EB" />
      </View>
      <Text className="mb-2 text-2xl font-bold text-gray-900">Buat Akun</Text>
      <Text className="text-center text-base text-gray-600">
        Gabung sebagai mitra pengemudi TripNus dan wujudkan perjalanan aman,
        nyaman, serta penghasilan tambahan setiap hari.
      </Text>
    </View>
  );
}

// Reusable input field component with icon
function InputField({
  label,
  icon,
  ...props
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm text-gray-700">{label}</Text>
      <View className="flex-row items-center rounded-xl border border-gray-200 bg-gray-50">
        <View className="pl-4 pr-2">
          <Ionicons name={icon} size={20} color="#6B7280" />
        </View>
        <TextInput
          className="flex-1 px-2 py-3"
          placeholderTextColor="#9CA3AF"
          {...props}
        />
      </View>
    </View>
  );
}

// Password requirements checklist component
function PasswordRequirements({
  requirements,
}: {
  requirements: PasswordRequirement[];
}) {
  return (
    <View className="rounded-xl bg-gray-50 p-4">
      <Text className="mb-2 text-sm font-medium text-gray-700">
        Persyaratan Kata Sandi:
      </Text>
      {requirements.map((req, index) => (
        <View key={index} className="mb-1.5 flex-row items-center">
          <Ionicons
            name={req.met ? 'checkmark-circle' : 'close-circle'}
            size={16}
            color={req.met ? '#10B981' : '#EF4444'}
          />
          <Text
            className={`ml-2 text-xs ${
              req.met ? 'text-green-600' : 'text-gray-600'
            }`}
          >
            {req.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function Register() {
  const { register } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Initialize password requirements state
  const [requirements, setRequirements] = useState<PasswordRequirement[]>(
    PASSWORD_REQUIREMENTS.map((req) => ({ ...req, met: false }))
  );

  // Update password requirements validation on password change
  useEffect(() => {
    setRequirements((prev) =>
      prev.map((req) => ({
        ...req,
        met: req.regex.test(password),
      }))
    );
  }, [password]);

  const allRequirementsMet = requirements.every((req) => req.met);

  // Handle registration form submission
  const handleRegister = async () => {
    setIsLoading(true);
    try {
      await register(email, password);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="flex-1 justify-between">
        {/* Brand Logo */}
        <View>
          <Logo />
        </View>

        {/* Main Content */}
        <View className="px-6">
          <Header />

          {/* Registration Form */}
          <View className="mx-2 space-y-4">
            <InputField
              label="Email"
              icon="mail"
              placeholder="anda@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />

            <InputField
              label="Kata Sandi"
              icon="lock-closed"
              placeholder="Kata Sandi"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isLoading}
            />

            <PasswordRequirements requirements={requirements} />
          </View>

          {/* Action Buttons */}
          <View className="mx-2 mt-8 space-y-4">
            <TouchableOpacity
              className={`${
                !allRequirementsMet || isLoading ? 'bg-blue-300' : 'bg-blue-600'
              } mb-4 flex-row items-center justify-center rounded-xl py-4`}
              onPress={handleRegister}
              disabled={!allRequirementsMet || isLoading}
            >
              <Ionicons
                name="person-add"
                size={20}
                color="white"
                style={{ marginRight: 8 }}
              />
              <Text className="text-base font-semibold text-white">
                {isLoading ? 'Membuat Akun...' : 'Buat Akun'}
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View className="my-4 flex-row items-center justify-center">
              <View className="h-[1px] flex-1 bg-gray-200" />
              <Text className="mx-4 text-gray-500">atau</Text>
              <View className="h-[1px] flex-1 bg-gray-200" />
            </View>

            {/* Login Link */}
            <TouchableOpacity
              className="items-center rounded-xl py-4"
              onPress={() => router.replace('/login')}
            >
              <Text className="text-base font-semibold text-blue-600">
                Sudah punya akun?
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
    </ScrollView>
  );
}
