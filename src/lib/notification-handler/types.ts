export type RideRequestData = {
  type: 'NEW_RIDE_REQUEST';
  vehicle_type: 'motorcycle' | 'car';
  ride_id: string;
  distance_to_pickup_km: number;
  distance_m: number;
  duration_s: number;
  fare: number;
  platform_fee: number;
  driver_earning: number;
  app_commission: number;
  fare_breakdown: {
    base_fare: number;
    distance_fare: number;
    duration_fare: number;
    rounding_adjustment: number;
    platform_fee: number;
  };
  pickup: {
    coords: [number, number];
    address: string;
  };
  dropoff: {
    coords: [number, number];
    address: string;
  };
  request_expired_at: number;
};

export type CancelRideData = {
  type: string;
  reason: string;
};

export type NotificationData = RideRequestData | CancelRideData;
