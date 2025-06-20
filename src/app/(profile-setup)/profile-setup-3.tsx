import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useContext, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { updateDriverProfileApi, uploadDriverPictureApi } from '@/api/driver';
import { type PhotoType } from '@/api/types/driver';
import { AuthContext } from '@/lib/auth';
import {
  DateInput,
  DebugButton,
  DebugOutput,
  DocumentUploadButton,
  FormInput,
  Header,
  Logo,
  ProfilePictureCamera,
  SectionHeader,
  SelectionInput,
  SubmitButton,
} from '@/lib/profile-setup/components';
import {
  DRIVER_LICENSE_CLASSES,
  GENDER_OPTIONS,
  VEHICLE_BRANDS,
  VEHICLE_COLORS,
  VEHICLE_TYPES,
  VEHICLE_YEARS,
} from '@/lib/profile-setup/constants';
import {
  type FormInputData,
  type UploadedDocsState,
} from '@/lib/profile-setup/types';
import {
  formatFormDataForSubmission,
  getFileName,
  validateForm,
} from '@/lib/profile-setup/utils';

export const initialFormData: FormInputData = {
  address_line1: '',
  address_line2: '',
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

export default function ProfileSetup3() {
  const [formData, setFormData] = useState<FormInputData>(initialFormData);
  const [formErrors, setFormErrors] = useState<
    ReturnType<typeof validateForm>['errors']
  >({});
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocsState>({
    profile: false,
    ktp: false,
    license: false,
    stnk: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<PhotoType | null>(null);
  const [showDebugOutput, setShowDebugOutput] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [profilePictureUploaded, setProfilePictureUploaded] = useState(false);

  const { authData, setAuthData } = useContext(AuthContext);
  const router = useRouter();

  const isFormValid = () => {
    const requiredFields = Object.entries(formData).filter(
      ([key]) => key !== 'address_line2'
    );
    const allFieldsFilled = requiredFields.every(
      ([, value]) => value && value.trim() !== ''
    );
    const allDocsUploaded =
      Object.values(uploadedDocs).every((value) => value) &&
      profilePictureUploaded;
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

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        quality: 0.7, // Compress to 50% quality
        base64: false,
        exif: false,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingDoc(type);

        try {
          // Create FormData
          const formData = new FormData();
          const fileName = getFileName(type);

          // @ts-expect-error React Native's FormData accepts File-like objects
          formData.append('file', {
            uri: result.assets[0].uri,
            type: 'image/jpeg',
            name: fileName,
          });

          formData.append('photoType', type);

          const { error: uploadError } = await uploadDriverPictureApi(
            authData!.session.access_token,
            formData
          );

          if (!uploadError) {
            setUploadedDocs((prev) => ({ ...prev, [type]: true }));
            Alert.alert('Sukses', 'Dokumen berhasil diupload');
          } else {
            Alert.alert(
              'Error',
              uploadError || 'Gagal mengupload dokumen. Silakan coba lagi.'
            );
          }
        } catch (error) {
          console.error('Error processing image:', error);
          Alert.alert('Error', 'Gagal memproses gambar. Silakan coba lagi.');
        }
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      Alert.alert(
        'Error',
        'Terjadi kesalahan saat mengupload dokumen. Silakan coba lagi.'
      );
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleProfilePictureCapture = async (uri: string) => {
    setShowCamera(false);
    setUploadingDoc('profile');

    try {
      // Create FormData
      const formData = new FormData();
      const fileName = getFileName('profile');

      // @ts-expect-error React Native's FormData accepts File-like objects
      formData.append('file', {
        uri,
        type: 'image/jpeg',
        name: fileName,
      });
      formData.append('photoType', 'profile');

      const { error: uploadError } = await uploadDriverPictureApi(
        authData!.session.access_token,
        formData
      );

      if (!uploadError) {
        setProfilePictureUploaded(true);
        setUploadedDocs((prev) => ({ ...prev, profile: true }));
        Alert.alert('Sukses', 'Foto profil berhasil diupload');
      } else {
        Alert.alert(
          'Error',
          uploadError || 'Gagal mengupload foto. Silakan coba lagi.'
        );
      }
    } catch (err) {
      console.error('Error uploading profile picture:', err);
      Alert.alert('Error', 'Gagal mengupload foto. Silakan coba lagi.');
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleFormChange = (field: keyof FormInputData, value: string) => {
    if (field === 'driver_license_number') {
      // Only allow digits and limit to 12 characters
      const numbersOnly = value.replace(/\D/g, '').slice(0, 12);
      setFormData((prev) => ({
        ...prev,
        [field]: numbersOnly,
      }));
    } else if (field === 'vehicle_plate_number') {
      // Convert to uppercase for plate number
      setFormData((prev) => ({
        ...prev,
        [field]: value.toUpperCase(),
      }));
    } else if (field === 'vehicle_registration_no') {
      // Convert to uppercase and remove invalid characters for VIN
      // VIN can only contain numbers and letters (except I, O, Q)
      const validVinChars = value
        .toUpperCase()
        .replace(/[^A-HJ-NPR-Z0-9]/g, '')
        .slice(0, 17);
      setFormData((prev) => ({
        ...prev,
        [field]: validVinChars,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleSubmit = async () => {
    const validation = validateForm(formData);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
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

      const { error: updateError } = await updateDriverProfileApi(
        authData!.session.access_token,
        {
          ...formattedData,
          status: 'submitted',
        }
      );

      if (!updateError) {
        await setAuthData({
          ...authData!,
          driverStatus: 'submitted',
        });

        router.replace('/profile-setup-4');
      } else {
        Alert.alert('Error', 'Gagal menyimpan data. Silakan coba lagi.');
      }
    } catch {
      Alert.alert('Error', 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
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

          {/* Profile Picture Section */}
          <SectionHeader title="Foto Profil" />
          <DocumentUploadButton
            title="Ambil Foto Profil"
            onPress={() => setShowCamera(true)}
            isUploaded={profilePictureUploaded}
            isLoading={uploadingDoc === 'profile'}
          />

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
            value={
              GENDER_OPTIONS.find((vehicle) => vehicle.value === formData.sex)
                ?.label || ''
            }
            onSelect={(label) => {
              const matched = GENDER_OPTIONS.find(
                (gender) => gender.label === label
              );
              if (matched) {
                handleFormChange('sex', matched.value);
              }
            }}
            options={GENDER_OPTIONS.map((gender) => gender.label)}
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
          <SelectionInput
            label="Kelas SIM"
            value={formData.driver_license_class || ''}
            onSelect={(value) =>
              handleFormChange('driver_license_class', value)
            }
            options={DRIVER_LICENSE_CLASSES}
            error={formErrors.driver_license_class}
          />
          <FormInput
            label="Nomor SIM"
            value={formData.driver_license_number || ''}
            onChangeText={(text) =>
              handleFormChange('driver_license_number', text)
            }
            placeholder="Masukkan nomor SIM (12 digit)"
            keyboardType="numeric"
            maxLength={12}
            error={formErrors.driver_license_number}
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
            // value={formData.vehicle_type || ''}
            value={
              VEHICLE_TYPES.find(
                (vehicle) => vehicle.value === formData.vehicle_type
              )?.label || ''
            }
            onSelect={(label) => {
              const matched = VEHICLE_TYPES.find(
                (vehicle) => vehicle.label === label
              );
              if (matched) {
                handleFormChange('vehicle_type', matched.value);
              }
            }}
            options={VEHICLE_TYPES.map((type) => type.label)}
            error={formErrors.vehicle_type}
          />
          <SelectionInput
            label="Tahun Kendaraan"
            value={formData.vehicle_year || ''}
            onSelect={(value) => handleFormChange('vehicle_year', value)}
            options={VEHICLE_YEARS}
            error={formErrors.vehicle_year}
          />
          <SelectionInput
            label="Merek Kendaraan"
            value={formData.vehicle_brand || ''}
            onSelect={(value) => handleFormChange('vehicle_brand', value)}
            options={VEHICLE_BRANDS}
            error={formErrors.vehicle_brand}
            useModal={true}
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
            placeholder="Masukkan nomor VIN (17 karakter)"
            maxLength={17}
            error={formErrors.vehicle_registration_no}
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

      {/* Camera Modal */}
      <ProfilePictureCamera
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleProfilePictureCapture}
      />
    </View>
  );
}
