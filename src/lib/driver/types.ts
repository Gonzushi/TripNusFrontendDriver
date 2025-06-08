export type ProfileFormData = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
};

export type UpdateProfileResponse = {
  status: number;
  message?: string;
  data?: {
    first_name: string;
    last_name: string | null;
  };
};

export type UpdatePhoneResponse = {
  status: number;
  message?: string;
  data?: {
    phone: string;
  };
};

export type CreateRiderResponse = {
  status: number;
  message?: string;
  data: {
    id: string;
  };
};

// New types for driver API

export type PhotoType = 'profile' | 'ktp' | 'license' | 'stnk';

export type UploadPhotoResponse = {
  status: number;
  message?: string;
  code?: string;
  error?: string;
  data?: {
    id: string;
    user_id: string;
    profile_picture_url?: string;
    ktp_photo_url?: string;
    driver_license_photo_url?: string;
    vehicle_registration_photo_url?: string;
  };
};

export type UpdateDriverProfileData = {
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  sex?: string;
  address_line1?: string;
  address_line2?: string | undefined;
  city?: string;
  driver_license_class?: string;
  driver_license_number?: string;
  driver_license_expiration?: string;
  ktp_id?: string;
  postal_code?: string;
  vehicle_type?: string;
  vehicle_brand?: string;
  vehicle_color?: string;
  vehicle_model?: string;
  vehicle_plate_number?: string;
  vehicle_registration_no?: string;
  vehicle_year?: string;
  driver_status?: string;
};

export type UpdateDriverProfileResponse = {
  status: number;
  message?: string;
  code?: string;
  error?: string;
  data?: UpdateDriverProfileData;
};

export type UpdateFcmTokenRequest = {
  fcm_token: string;
};

export type UpdateFcmTokenResponse = {
  status: number;
  message?: string;
  code?: string;
  error?: string;
};

// Generic error response type
export type ErrorResponse = {
  status: number;
  error: string;
  message: string;
  code: string;
};
