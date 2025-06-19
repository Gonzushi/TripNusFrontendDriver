export type Point = {
  type: 'Point';
  crs: {
    type: 'name';
    properties: {
      name: string;
    };
  };
  coordinates: [number, number];
};

export type FareBreakdown = {
  base_fare: number;
  distance_fare: number;
  duration_fare: number;
  rounding_adjustment: number;
  platform_fee: number;
};

export type RideStatus =
  | 'searching'
  | 'requesting_driver'
  | 'driver_accepted'
  | 'driver_arrived'
  | 'in_progress'
  | 'payment_in_progress'
  | 'completed'
  | 'cancelled';

export type VehicleType = 'motorcycle' | 'car';
export type ServiceVariant = 'standard' | 'premium';

export type MatchAttempt = {
  retry_count: number;
  attempted_at: number;
  message_data: {
    fare: number;
    type: string;
    pickup: {
      coords: [number, number];
      address: string;
    };
    dropoff: {
      coords: [number, number];
      address: string;
    };
    ride_id: string;
    distance_m: number;
    duration_s: number;
    platform_fee: number;
    app_commission: number;
    driver_earning: number;
    fare_breakdown: FareBreakdown;
    request_expired_at: number;
    distance_to_pickup_km: number;
  };
  attemptedDrivers: string[];
};

export type RideData = {
  id: string;
  rider_id: string;
  driver_id: string | null;
  distance_m: number;
  duration_s: number;
  status: RideStatus;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
  vehicle_type: VehicleType;
  service_variant: ServiceVariant;
  fare: number;
  driver_earning: number;
  app_commission: number;
  platform_fee: number;
  fare_breakdown: FareBreakdown;
  planned_pickup_coords: Point;
  planned_pickup_address: string;
  planned_dropoff_coords: Point;
  planned_dropoff_address: string;
  actual_pickup_coords: Point | null;
  actual_dropoff_coords: Point | null;
  match_attempt?: MatchAttempt;
  status_reason: string | null;
};

export type RideDataDriver = RideData & {
  drivers: {
    auth_id: string;
  };
  riders: {
    users: {
      phone: string;
    };
    id: string;
    rating: number;
    fist_name: string;
    last_name: string;
    completed_rides: number;
    profile_picture_url: string;
  };
};

export type RideDataRider = RideData & {
  riders: {
    auth_id: string;
  };
  drivers?: {
    users: {
      phone: string;
    };
    id: string;
    rating: number;
    first_name: string;
    last_name: string;
    vehicle_type: string;
    vehicle_year: number;
    vehicle_brand: string;
    vehicle_color: string;
    vehicle_model: string;
    profile_picture_url: string;
    vehicle_plate_number: string;
    completed_rides?: number | null;
  };
  driverLocation?: {
    latitude: number;
    longitude: number;
    heading_deg: number;
    speed_kph: number;
  };
};

export type RideResponse = {
  status: number;
  code: string;
  message: string;
  error?: string;
  data?: RideData;
};

export type CancelRideResponse = {
  status: number;
  message?: string;
  code: string;
  data: RideData;
  error?: string;
};

export type CreateRidePayload = {
  distance_m: number;
  duration_s: number;
  vehicle_type: VehicleType;
  service_variant: ServiceVariant;
  fare: number;
  platform_fee: number;
  driver_earning: number;
  app_commission: number;
  fare_breakdown: FareBreakdown;
  planned_pickup_coords: [number, number];
  planned_pickup_address: string;
  planned_dropoff_coords: [number, number];
  planned_dropoff_address: string;
};

export type UpdateRidePayload = {
  rideId: string;
  driver_id?: string;
  status?: RideStatus;
  ended_at?: string;
  actual_pickup_coords?: [number, number];
  actual_dropoff_coords?: [number, number];
};

export type ConfirmPickupPayload = {
  ride_id: string;
  driver_id: string;
  actual_pickup_coords: {
    latitude: number;
    longitude: number;
  };
};

export type ConfirmDropoffPayload = {
  ride_id: string;
  driver_id: string;
  actual_dropoff_coords: {
    latitude: number;
    longitude: number;
  };
};

export type ConfirmPaymentPayload = {
  ride_id: string;
  driver_id: string;
};

export type CreateRideResponse = {
  status: number;
  code: string;
  message: string;
  data: RideData;
  error?: string;
};
