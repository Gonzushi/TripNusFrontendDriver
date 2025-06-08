import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useContext, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { VEHICLE_BRANDS, VEHICLE_COLORS } from '@/constants/profile-setup';
import { AuthContext } from '@/lib/auth';
import { updateDriverProfileApi, uploadDriverPhotoApi } from '@/lib/driver/api';
import {
  type PhotoType,
  type UpdateDriverProfileData,
} from '@/lib/driver/types';

// Constants
const DEBUG_MODE = true;

// Generate years from 2010 to current year
const currentYear = new Date().getFullYear();
const VEHICLE_YEARS = Array.from({ length: currentYear - 2010 + 1 }, (_, i) =>
  String(currentYear - i)
) as readonly string[];

const VEHICLE_TYPES = ['Mobil', 'Sepeda Motor'] as const;
const DRIVER_LICENSE_CLASSES = ['A', 'C'] as const;
const GENDER_OPTIONS = ['Laki-laki', 'Perempuan'] as const;

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
function SectionHeader({ title }: { title: string }) {
  return (
    <View className="mb-4 mt-6">
      <Text className="text-lg font-semibold text-gray-900">{title}</Text>
      <View className="mt-2 h-0.5 bg-gray-100" />
    </View>
  );
}

// Form input component
function FormInput({
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
function ModalPicker({
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
function SelectionInput({
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
function DateInput({
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
function DocumentUploadButton({
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
function SubmitButton({
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
function DebugOutput({ data }: { data: UpdateDriverProfileData }) {
  if (!DEBUG_MODE) return null;

  return (
    <View className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <Text className="mb-2 font-bold">Debug Output:</Text>
      <Text className="font-mono">{JSON.stringify(data, null, 2)}</Text>
    </View>
  );
}

// Debug Button component
function DebugButton({ onPress }: { onPress: () => void }) {
  if (!DEBUG_MODE) return null;

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

export default function ProfileSetup3() {
  const initialFormData: UpdateDriverProfileData = {
    address_line1: '',
    address_line2: undefined,
    city: '',
    date_of_birth: '',
    sex: '',
    driver_license_class: '',
    driver_license_expiration: '',
    driver_license_number: '',
    ktp_id: '',
    postal_code: '',
    vehicle_brand: '',
    vehicle_color: '',
    vehicle_model: '',
    vehicle_plate_number: '',
    vehicle_type: '',
    vehicle_registration_no: '',
    vehicle_year: '',
  };

  const [formData, setFormData] =
    useState<UpdateDriverProfileData>(initialFormData);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof UpdateDriverProfileData, string>>
  >({});

  const [uploadedDocs, setUploadedDocs] = useState({
    ktp: false,
    license: false,
    stnk: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<PhotoType | null>(null);
  const [showDebugOutput, setShowDebugOutput] = useState(false);

  const { authData } = useContext(AuthContext);
  const router = useRouter();

  const isFormValid = () => {
    const requiredFields = Object.entries(formData).filter(
      ([key]) => key !== 'address_line2'
    );
    const allFieldsFilled = requiredFields.every(
      ([, value]) => value && value.trim() !== ''
    );
    const allDocsUploaded = Object.values(uploadedDocs).every((value) => value);
    return allFieldsFilled && allDocsUploaded;
  };

  const handleUploadDocument = async (type: PhotoType) => {
    try {
      // Request permission first
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Izin Diperlukan',
          'Aplikasi memerlukan izin untuk mengakses galeri foto.'
        );
        return;
      }
      console.log('launching image picker');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        quality: 0.8,
        base64: false,
        exif: false,
        aspect: [4, 3],
      });
      console.log(result);

      if (!result.canceled && result.assets[0]) {
        setUploadingDoc(type);

        // Create a blob from the image URI
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();

        console.log('blob', blob);

        const uploadResponse = await uploadDriverPhotoApi(
          authData!.session.access_token,
          blob,
          type
        );

        console.log(uploadResponse);

        if (uploadResponse.status === 200) {
          setUploadedDocs((prev) => ({ ...prev, [type]: true }));
          Alert.alert('Sukses', 'Dokumen berhasil diupload');
        } else {
          Alert.alert(
            'Error',
            uploadResponse.message ||
              'Gagal mengupload dokumen. Silakan coba lagi.'
          );
        }
      }
    } catch {
      Alert.alert(
        'Error',
        'Terjadi kesalahan saat mengupload dokumen. Silakan coba lagi.'
      );
    } finally {
      setUploadingDoc(null);
    }
  };

  const validateForm = () => {
    const errors: Partial<Record<keyof UpdateDriverProfileData, string>> = {};

    // KTP validation (16 digits)
    if (!/^\d{16}$/.test(formData.ktp_id || '')) {
      errors.ktp_id = 'Nomor KTP harus 16 digit angka';
    }

    // Postal code validation (5 digits)
    if (!/^\d{5}$/.test(formData.postal_code || '')) {
      errors.postal_code = 'Kode pos harus 5 digit angka';
    }

    // Date validations
    const dateRegex = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;

    if (!dateRegex.test(formData.date_of_birth || '')) {
      errors.date_of_birth = 'Format tanggal tidak valid (YYYY-MM-DD)';
    }

    if (!dateRegex.test(formData.driver_license_expiration || '')) {
      errors.driver_license_expiration =
        'Format tanggal tidak valid (YYYY-MM-DD)';
    }

    // Required field validations
    if (!formData.sex) {
      errors.sex = 'Pilih jenis kelamin';
    }

    if (!formData.driver_license_class) {
      errors.driver_license_class = 'Pilih kelas SIM';
    }

    if (!formData.vehicle_type) {
      errors.vehicle_type = 'Pilih tipe kendaraan';
    }

    if (!formData.vehicle_color) {
      errors.vehicle_color = 'Pilih warna kendaraan';
    }

    if (!formData.vehicle_brand) {
      errors.vehicle_brand = 'Pilih merek kendaraan';
    }

    if (!formData.vehicle_year) {
      errors.vehicle_year = 'Pilih tahun kendaraan';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const formatFormDataForSubmission = (
    data: UpdateDriverProfileData
  ): UpdateDriverProfileData => {
    const formatted = { ...data };

    // Trim all string values and convert empty strings to undefined
    Object.keys(formatted).forEach((key) => {
      const value = formatted[key as keyof UpdateDriverProfileData];
      if (typeof value === 'string') {
        const trimmed = value.trim();
        formatted[key as keyof UpdateDriverProfileData] = trimmed || undefined;
      }
    });

    // Special handling for vehicle plate number - remove all spaces
    if (formatted.vehicle_plate_number) {
      formatted.vehicle_plate_number = formatted.vehicle_plate_number.replace(
        /\s+/g,
        ''
      );
    }

    return formatted;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert(
        'Error',
        'Mohon lengkapi semua data yang diperlukan dengan benar'
      );
      return;
    }

    setIsLoading(true);
    try {
      // Format the data before submission
      const formattedData = formatFormDataForSubmission(formData);

      const response = await updateDriverProfileApi(
        authData!.session.access_token,
        formattedData
      );

      if (response.status === 200) {
        router.replace('/(profile-setup)/profile-setup-4' as never);
      } else {
        Alert.alert('Error', 'Gagal menyimpan data. Silakan coba lagi.');
      }
    } catch {
      Alert.alert('Error', 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormChange = (
    field: keyof UpdateDriverProfileData,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: field === 'address_line2' ? value || undefined : value,
    }));
  };

  const handleDebugPress = () => {
    setShowDebugOutput(!showDebugOutput);
    console.log('Form Data:', formData);
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView>
        <Logo />
        <View className="px-6">
          <Header />

          {/* Personal Information Section */}
          <SectionHeader title="Informasi Pribadi" />
          <FormInput
            label="Nomor KTP"
            value={formData.ktp_id || ''}
            onChangeText={(text) => handleFormChange('ktp_id', text)}
            placeholder="Masukkan nomor KTP (16 digit)"
            keyboardType="numeric"
            maxLength={16}
            error={formErrors.ktp_id}
          />
          <DateInput
            label="Tanggal Lahir"
            value={formData.date_of_birth || ''}
            onChangeText={(text) => handleFormChange('date_of_birth', text)}
            placeholder="YYYY-MM-DD"
            error={formErrors.date_of_birth}
          />
          <SelectionInput
            label="Jenis Kelamin"
            value={formData.sex || ''}
            onSelect={(value) => handleFormChange('sex', value)}
            options={GENDER_OPTIONS}
            error={formErrors.sex}
          />
          <FormInput
            label="Alamat"
            value={formData.address_line1 || ''}
            onChangeText={(text) => handleFormChange('address_line1', text)}
            placeholder="Masukkan alamat lengkap"
          />
          <FormInput
            label="Alamat (Baris 2)"
            value={formData.address_line2 || ''}
            onChangeText={(text) => handleFormChange('address_line2', text)}
            placeholder="RT/RW, Kelurahan, Kecamatan (opsional)"
            isRequired={false}
          />
          <FormInput
            label="Kota"
            value={formData.city || ''}
            onChangeText={(text) => handleFormChange('city', text)}
            placeholder="Masukkan nama kota"
          />
          <FormInput
            label="Kode Pos"
            value={formData.postal_code || ''}
            onChangeText={(text) => handleFormChange('postal_code', text)}
            placeholder="Masukkan kode pos (5 digit)"
            keyboardType="numeric"
            maxLength={5}
            error={formErrors.postal_code}
          />

          {/* Driver License Section */}
          <SectionHeader title="Informasi SIM" />
          <FormInput
            label="Nomor SIM"
            value={formData.driver_license_number || ''}
            onChangeText={(text) =>
              handleFormChange('driver_license_number', text)
            }
            placeholder="Masukkan nomor SIM"
          />
          <SelectionInput
            label="Kelas SIM"
            value={formData.driver_license_class || ''}
            onSelect={(value) =>
              handleFormChange('driver_license_class', value)
            }
            options={DRIVER_LICENSE_CLASSES}
            error={formErrors.driver_license_class}
          />
          <DateInput
            label="Tanggal Kadaluarsa SIM"
            value={formData.driver_license_expiration || ''}
            onChangeText={(text) =>
              handleFormChange('driver_license_expiration', text)
            }
            placeholder="YYYY-MM-DD"
            error={formErrors.driver_license_expiration}
          />

          {/* Vehicle Information Section */}
          <SectionHeader title="Informasi Kendaraan" />
          <SelectionInput
            label="Tipe Kendaraan"
            value={formData.vehicle_type || ''}
            onSelect={(value) => handleFormChange('vehicle_type', value)}
            options={VEHICLE_TYPES}
            error={formErrors.vehicle_type}
          />
          <SelectionInput
            label="Merek Kendaraan"
            value={formData.vehicle_brand || ''}
            onSelect={(value) => handleFormChange('vehicle_brand', value)}
            options={VEHICLE_BRANDS}
            error={formErrors.vehicle_brand}
            useModal={true}
          />
          <SelectionInput
            label="Tahun Kendaraan"
            value={formData.vehicle_year || ''}
            onSelect={(value) => handleFormChange('vehicle_year', value)}
            options={VEHICLE_YEARS}
            error={formErrors.vehicle_year}
          />
          <FormInput
            label="Model Kendaraan"
            value={formData.vehicle_model || ''}
            onChangeText={(text) => handleFormChange('vehicle_model', text)}
            placeholder="Contoh: Avanza"
          />
          <SelectionInput
            label="Warna Kendaraan"
            value={formData.vehicle_color || ''}
            onSelect={(value) => handleFormChange('vehicle_color', value)}
            options={VEHICLE_COLORS}
            error={formErrors.vehicle_color}
          />
          <FormInput
            label="Nomor Plat Kendaraan"
            value={formData.vehicle_plate_number || ''}
            onChangeText={(text) =>
              handleFormChange('vehicle_plate_number', text)
            }
            placeholder="Contoh: B 1234 ABC"
          />
          <FormInput
            label="Nomor Registrasi Kendaraan (VIN)"
            value={formData.vehicle_registration_no || ''}
            onChangeText={(text) =>
              handleFormChange('vehicle_registration_no', text)
            }
            placeholder="Masukkan nomor registrasi"
          />

          {/* Document Upload Section */}
          <SectionHeader title="Upload Dokumen" />
          <DocumentUploadButton
            title="Upload Foto KTP"
            onPress={() => handleUploadDocument('ktp')}
            isUploaded={uploadedDocs.ktp}
            isLoading={uploadingDoc === 'ktp'}
          />
          <DocumentUploadButton
            title="Upload Foto SIM"
            onPress={() => handleUploadDocument('license')}
            isUploaded={uploadedDocs.license}
            isLoading={uploadingDoc === 'license'}
          />
          <DocumentUploadButton
            title="Upload Foto STNK"
            onPress={() => handleUploadDocument('stnk')}
            isUploaded={uploadedDocs.stnk}
            isLoading={uploadingDoc === 'stnk'}
          />

          {/* Debug Button */}
          <DebugButton onPress={handleDebugPress} />

          {/* Debug Output */}
          {showDebugOutput && <DebugOutput data={formData} />}

          {/* Submit Button */}
          <View className="my-8">
            <SubmitButton
              onPress={handleSubmit}
              isLoading={isLoading}
              isValid={isFormValid()}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
