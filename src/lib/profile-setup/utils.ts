import { type DriverProfile } from '@/api/types/driver';
import {
  type PhotoType,
  type UpdateDriverProfileData,
} from '@/lib/driver/types';

import { type FormInputData } from './types';

// Function to generate a file name based on type
export function getFileName(type: PhotoType): string {
  const timestamp = new Date().getTime();
  switch (type) {
    case 'ktp':
      return `ktp_${timestamp}.jpg`;
    case 'license':
      return `license_${timestamp}.jpg`;
    case 'stnk':
      return `stnk_${timestamp}.jpg`;
    case 'profile':
      return `profile_${timestamp}.jpg`;
    default:
      return `${type}_${timestamp}.jpg`;
  }
}

// Function to format form data for submission
export function formatFormDataForSubmission(
  data: FormInputData
): DriverProfile {
  const formatted: Partial<DriverProfile> = {
    status: 'submitted',
  };

  // Handle all fields
  Object.entries(data).forEach(([key, rawValue]) => {
    const value = rawValue?.trim();
    if (value) {
      if (key === 'vehicle_plate_number' || key === 'vehicle_registration_no') {
        // Remove all spaces and convert to uppercase for plate number and VIN
        formatted[key] = value.replace(/\s+/g, '').toUpperCase();
      } else if (key === 'driver_license_number') {
        // Only include if it's exactly 12 digits
        if (/^\d{12}$/.test(value)) {
          formatted[key] = value;
        }
      } else if (key !== 'status') {
        // Skip driver_status as we set it above
        (formatted as Record<string, string>)[key] = value;
      }
    }
  });

  return formatted as DriverProfile;
}

// Function to validate form data
export function validateForm(formData: FormInputData): {
  isValid: boolean;
  errors: Partial<Record<keyof UpdateDriverProfileData, string>>;
} {
  const errors: Partial<Record<keyof UpdateDriverProfileData, string>> = {};

  // KTP validation (16 digits)
  if (!/^\d{16}$/.test(formData.ktp_id || '')) {
    errors.ktp_id = 'Nomor KTP harus 16 digit angka';
  }

  // Driver License Number validation (12 digits)
  if (!/^\d{12}$/.test(formData.driver_license_number || '')) {
    errors.driver_license_number = 'Nomor SIM harus 12 digit angka';
  }

  // Postal code validation (5 digits)
  if (!/^\d{5}$/.test(formData.postal_code || '')) {
    errors.postal_code = 'Kode pos harus 5 digit angka';
  }

  // Date validations (YYYY-MM-DD format for PostgreSQL date type)
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

  // Vehicle year validation (must be a number)
  if (formData.vehicle_year) {
    const year = Number(formData.vehicle_year);
    const currentYear = new Date().getFullYear();
    if (isNaN(year) || year < 2010 || year > currentYear) {
      errors.vehicle_year = 'Tahun kendaraan tidak valid';
    }
  } else {
    errors.vehicle_year = 'Pilih tahun kendaraan';
  }

  // Length validations based on varchar limits
  if ((formData.driver_license_number?.length || 0) > 50) {
    errors.driver_license_number =
      'Nomor SIM terlalu panjang (max 50 karakter)';
  }

  if ((formData.vehicle_brand?.length || 0) > 50) {
    errors.vehicle_brand = 'Merek kendaraan terlalu panjang (max 50 karakter)';
  }

  if ((formData.vehicle_color?.length || 0) > 50) {
    errors.vehicle_color = 'Warna kendaraan terlalu panjang (max 50 karakter)';
  }

  if ((formData.vehicle_model?.length || 0) > 50) {
    errors.vehicle_model = 'Model kendaraan terlalu panjang (max 50 karakter)';
  }

  if ((formData.vehicle_plate_number?.length || 0) > 20) {
    errors.vehicle_plate_number =
      'Nomor plat terlalu panjang (max 20 karakter)';
  }

  if ((formData.city?.length || 0) > 50) {
    errors.city = 'Nama kota terlalu panjang (max 50 karakter)';
  }

  // VIN validation (17 characters)
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(formData.vehicle_registration_no || '')) {
    errors.vehicle_registration_no =
      'Nomor VIN harus 17 karakter (tidak boleh mengandung I, O, Q)';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
