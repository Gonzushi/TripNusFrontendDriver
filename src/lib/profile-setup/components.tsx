import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import React, { useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { type initialFormData } from '@/app/(profile-setup)/profile-setup-3';

// Logo component
export function Logo() {
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
export function Header() {
  return (
    <View className="mb-8 mt-8 items-center">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-blue-100">
        <Ionicons name="document-text" size={32} color="#2563EB" />
      </View>
      <Text className="mb-2 text-2xl font-bold text-gray-900">
        Informasi Driver
      </Text>
      <Text className="text-center text-base text-gray-600">
        Lengkapi informasi dan dokumen Anda untuk menjadi mitra driver TripNus
      </Text>
    </View>
  );
}

// Section Header component
export function SectionHeader({ title }: { title: string }) {
  return (
    <View className="mb-4 mt-6">
      <Text className="text-lg font-semibold text-gray-900">{title}</Text>
      <View className="mt-2 h-0.5 bg-gray-100" />
    </View>
  );
}

// Form input component
export function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  isRequired = true,
  isLoading = false,
  keyboardType = 'default',
  maxLength,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  isRequired?: boolean;
  isLoading?: boolean;
  keyboardType?: 'default' | 'numeric';
  maxLength?: number;
  error?: string;
}) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm text-gray-700">
        {label} {isRequired && '*'}
      </Text>
      <View
        className={`rounded-xl border ${error ? 'border-red-500' : 'border-gray-200'} bg-gray-50`}
      >
        <TextInput
          className="px-4 py-3"
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          editable={!isLoading}
          maxLength={maxLength}
          placeholderTextColor="#9CA3AF"
        />
      </View>
      {error && <Text className="mt-1 text-sm text-red-500">{error}</Text>}
    </View>
  );
}

// Modal Picker component
export function ModalPicker({
  visible,
  onClose,
  onSelect,
  options,
  value,
  title,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
  options: readonly string[];
  value: string;
  title: string;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50">
        <View className="mt-auto h-3/4 rounded-t-3xl bg-white p-6">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-gray-900">{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView className="flex-1">
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                onPress={() => {
                  onSelect(option);
                  onClose();
                }}
                className={`border-b border-gray-100 py-4 ${
                  value === option ? 'bg-blue-50' : ''
                }`}
              >
                <Text
                  className={`text-base ${
                    value === option ? 'text-blue-600' : 'text-gray-700'
                  }`}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// Selection Input component
export function SelectionInput({
  label,
  value,
  onSelect,
  options,
  isRequired = true,
  error,
  useModal = false,
}: {
  label: string;
  value: string;
  onSelect: (value: string) => void;
  options: readonly string[];
  isRequired?: boolean;
  error?: string;
  useModal?: boolean;
}) {
  const [modalVisible, setModalVisible] = useState(false);

  if (useModal) {
    return (
      <View className="mb-4">
        <Text className="mb-1.5 text-sm text-gray-700">
          {label} {isRequired && '*'}
        </Text>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          className={`rounded-xl border px-4 py-3 ${
            error ? 'border-red-500' : 'border-gray-200'
          } bg-gray-50`}
        >
          <View className="flex-row items-center justify-between">
            <Text className={value ? 'text-gray-900' : 'text-gray-500'}>
              {value || `Pilih ${label}`}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </View>
        </TouchableOpacity>
        {error && <Text className="mt-1 text-sm text-red-500">{error}</Text>}
        <ModalPicker
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSelect={onSelect}
          options={options}
          value={value}
          title={`Pilih ${label}`}
        />
      </View>
    );
  }

  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm text-gray-700">
        {label} {isRequired && '*'}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            onPress={() => onSelect(option)}
            className={`rounded-xl border px-4 py-2 ${
              value === option
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <Text
              className={`text-sm ${
                value === option ? 'text-blue-700' : 'text-gray-700'
              }`}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {error && <Text className="mt-1 text-sm text-red-500">{error}</Text>}
    </View>
  );
}

// Date Input component
export function DateInput({
  label,
  value,
  onChangeText,
  placeholder,
  isRequired = true,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  isRequired?: boolean;
  error?: string;
}) {
  const formatDate = (text: string) => {
    // Remove any non-digit characters
    const cleaned = text.replace(/\D/g, '');

    // Format as YYYY-MM-DD
    if (cleaned.length <= 4) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
    } else {
      return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
    }
  };

  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm text-gray-700">
        {label} {isRequired && '*'}
      </Text>
      <View
        className={`rounded-xl border ${error ? 'border-red-500' : 'border-gray-200'} bg-gray-50`}
      >
        <TextInput
          className="px-4 py-3"
          placeholder={placeholder}
          value={value}
          onChangeText={(text) => onChangeText(formatDate(text))}
          keyboardType="numeric"
          maxLength={10}
          placeholderTextColor="#9CA3AF"
        />
      </View>
      {error && <Text className="mt-1 text-sm text-red-500">{error}</Text>}
    </View>
  );
}

// Document Upload Button component
export function DocumentUploadButton({
  title,
  onPress,
  isUploaded,
  isLoading,
}: {
  title: string;
  onPress: () => void;
  isUploaded: boolean;
  isLoading: boolean;
}) {
  return (
    <TouchableOpacity
      className={`mb-4 flex-row items-center justify-between rounded-xl border ${
        isUploaded
          ? 'border-green-500 bg-green-50'
          : 'border-gray-200 bg-gray-50'
      } p-4`}
      onPress={onPress}
      disabled={isLoading}
    >
      <View className="flex-row items-center">
        <Ionicons
          name={isUploaded ? 'checkmark-circle' : 'cloud-upload'}
          size={24}
          color={isUploaded ? '#22C55E' : '#6B7280'}
        />
        <Text
          className={`ml-3 ${
            isUploaded ? 'text-green-700' : 'text-gray-700'
          } font-medium`}
        >
          {title}
        </Text>
      </View>
      {isLoading ? (
        <Text className="text-sm text-gray-500">Mengupload...</Text>
      ) : (
        <Ionicons
          name={isUploaded ? 'checkmark' : 'arrow-forward'}
          size={20}
          color={isUploaded ? '#22C55E' : '#6B7280'}
        />
      )}
    </TouchableOpacity>
  );
}

// Submit button component
export function SubmitButton({
  onPress,
  isLoading,
  isValid,
}: {
  onPress: () => void;
  isLoading: boolean;
  isValid: boolean;
}) {
  return (
    <TouchableOpacity
      className={`mb-4 flex-row items-center justify-center rounded-xl py-4 ${
        isLoading ? 'bg-blue-300' : isValid ? 'bg-blue-600' : 'bg-gray-300'
      }`}
      onPress={onPress}
      disabled={isLoading || !isValid}
    >
      {isLoading ? (
        <Text className="text-base font-semibold text-white">
          Menyimpan Data...
        </Text>
      ) : (
        <>
          <Ionicons
            name="arrow-forward"
            size={20}
            color="white"
            style={{ marginRight: 8 }}
          />
          <Text className="text-base font-semibold text-white">Lanjutkan</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// Debug Output component
export function DebugOutput({ data }: { data: typeof initialFormData }) {
  return (
    <View className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <Text className="mb-2 font-bold">Debug Output:</Text>
      <Text className="font-mono">{JSON.stringify(data, null, 2)}</Text>
    </View>
  );
}

// Debug Button component
export function DebugButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      className="mb-4 rounded-xl bg-gray-800 py-4"
      onPress={onPress}
    >
      <Text className="text-center text-base font-semibold text-white">
        Debug: Log Form Data
      </Text>
    </TouchableOpacity>
  );
}

// Profile Picture Camera component
export function ProfilePictureCamera({
  visible,
  onClose,
  onCapture,
}: {
  visible: boolean;
  onClose: () => void;
  onCapture: (uri: string) => void;
}) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [hasShownPermissionRequest, setHasShownPermissionRequest] =
    useState(false);

  const handleRequestPermission = async () => {
    try {
      setHasShownPermissionRequest(true);
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Izin Kamera Diperlukan',
          'Aplikasi membutuhkan izin kamera untuk mengambil foto profil. Silakan aktifkan izin kamera di pengaturan.',
          [
            { text: 'Batal', style: 'cancel' },
            {
              text: 'Buka Pengaturan',
              onPress: () => {
                // Open app settings
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      Alert.alert('Error', 'Gagal meminta izin kamera. Silakan coba lagi.');
    }
  };

  // Reset permission request state when modal becomes visible
  React.useEffect(() => {
    if (visible) {
      setHasShownPermissionRequest(false);
    }
  }, [visible]);

  if (!permission) return null;

  if (!permission.granted && !hasShownPermissionRequest) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/40">
          <View className="w-8/12 max-w-md rounded-2xl bg-white p-6 shadow-lg">
            <Text className="mb-4 text-center text-lg font-medium text-gray-900">
              Kami membutuhkan izin untuk mengakses kamera
            </Text>

            <TouchableOpacity
              className="rounded-xl bg-blue-600 px-6 py-3"
              onPress={handleRequestPermission}
            >
              <Text className="text-center font-semibold text-white">
                Berikan Izin
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="mt-3 rounded-xl border border-gray-300 px-6 py-3"
              onPress={onClose}
            >
              <Text className="text-center font-medium text-gray-600">
                Batal
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // If permission is not granted and we've already shown the request, just return null
  if (!permission.granted) {
    return null;
  }

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });

      const manipulator = ImageManipulator.manipulate(photo.uri);
      manipulator.resize({ width: 1024 });
      const processedImage = await manipulator.renderAsync();
      const finalImage = await processedImage.saveAsync({
        compress: 0.7,
        format: SaveFormat.JPEG,
      });

      setPreviewUri(finalImage.uri); // show preview instead of sending immediately
    } catch (err) {
      console.error('Error taking picture:', err);
      Alert.alert('Error', 'Gagal mengambil foto. Silakan coba lagi.');
    }
  };

  const confirmPicture = () => {
    if (previewUri) {
      onCapture(previewUri);
      setPreviewUri(null);
    }
  };

  const retakePicture = () => {
    setPreviewUri(null);
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View className="flex-1 bg-black">
        {previewUri ? (
          <>
            <Image
              source={{ uri: previewUri }}
              style={{ flex: 1, resizeMode: 'contain' }}
            />
            <View className="absolute bottom-0 left-0 right-0 flex-row items-center justify-center gap-4 bg-black/50 p-6">
              <TouchableOpacity
                className="flex-1 items-center justify-center rounded-xl bg-blue-600 py-4"
                onPress={confirmPicture}
              >
                <Text className="text-base font-semibold text-white">
                  Gunakan Foto
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 items-center justify-center rounded-xl border-2 border-white bg-transparent py-4"
                onPress={retakePicture}
              >
                <Text className="text-base font-semibold text-white">
                  Ambil Ulang
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <CameraView
              ref={cameraRef}
              facing="front"
              style={{ flex: 1 }}
              mode="picture"
            />
            {/* Improved face guide overlay */}
            <View className="absolute inset-0 items-center justify-center">
              {/* Outer circle for face guide */}
              <View className="h-96 w-96 items-center justify-center rounded-full border-4 border-white/50">
                {/* Inner guides */}
                <View className="absolute h-full w-full">
                  {/* Center crosshair */}
                  <View className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2">
                    <View className="absolute left-1/2 h-full w-0.5 -translate-x-1/2 bg-white/30" />
                    <View className="absolute top-1/2 h-0.5 w-full -translate-y-1/2 bg-white/30" />
                  </View>
                  {/* Guide text */}
                  <Text className="absolute -bottom-16 w-full text-center text-base text-white/70">
                    Posisikan wajah Anda di dalam lingkaran
                  </Text>
                </View>
              </View>
            </View>
            <View className="absolute bottom-0 left-0 right-0 bg-black/50 p-6">
              <View className="relative flex-row items-center justify-center">
                {/* Centered capture button */}
                <TouchableOpacity
                  className="h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-transparent"
                  onPress={takePicture}
                >
                  <View className="h-16 w-16 rounded-full bg-white" />
                </TouchableOpacity>
                {/* Close button positioned absolutely on the right */}
                <TouchableOpacity
                  className="absolute right-0 h-12 w-12 items-center justify-center rounded-full bg-red-500"
                  onPress={onClose}
                >
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}
