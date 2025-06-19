export type UploadDriverPictureResponse = {
  id: string;
  user_id: string;
  profile_picture_url?: string;
  ktp_photo_url?: string;
  driver_license_photo_url?: string;
  vehicle_registration_photo_url?: string;
};

export type PhotoType = 'profile' | 'ktp' | 'license' | 'stnk';

export type RegistrationStatus =
  | 'draft'
  | 'submitted'
  | 'pending_review'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'expired'
  | 'completed'
  | 'on_hold'
  | 'needs_info'
  | 'duplicate';

export type AvailabilityStatus =
  | 'not_available'
  | 'available'
  | 'en_route_to_pickup'
  | 'waiting_at_pickup'
  | 'en_route_to_drop_off';

export type DriverProfile = {
  id?: string;
  first_name?: string;
  last_name?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  date_of_birth?: string;
  sex?: string;
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
  status?: RegistrationStatus | string;
  notes?: string;
  push_token?: string;
  is_online?: boolean;
  is_suspended?: boolean;
  availability_status?: AvailabilityStatus;
  decline_count?: number;
  missed_requests?: number;
};

export type NearbyDriver = {
  driver_id: string;
  distance_km: number;
  latitude: number;
  longitude: number;
};

export type NearbyDriversResponse = {
  motorcycle: NearbyDriver[];
  car: NearbyDriver[];
};
