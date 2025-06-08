import { type UpdateDriverProfileData } from '@/lib/driver/types';

// Form data type for handling string inputs
export type FormInputData = {
  [K in keyof UpdateDriverProfileData]: string;
};

// Document upload state type
export type UploadedDocsState = {
  ktp: boolean;
  license: boolean;
  stnk: boolean;
};
