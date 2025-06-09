import { type UpdateDriverProfileData } from '@/lib/driver/types';

// Form data type for handling string inputs
export type FormInputData = {
  [K in keyof UpdateDriverProfileData]: string;
};

// Uploaded documents state
export type UploadedDocsState = {
  profile: boolean;
  ktp: boolean;
  license: boolean;
  stnk: boolean;
};

// Vehicle type values
export type VehicleTypeValue = 'car' | 'motorcycle';
