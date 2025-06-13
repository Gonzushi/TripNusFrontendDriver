export type Point = {
  type: 'Point';
  crs: {
    type: 'name';
    properties: {
      name: 'EPSG:4326';
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
  | 'requesting_driver'
  | 'driver_accepted'
  | 'driver_arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type VehicleType = 'motorcycle' | 'car';
export type ServiceVariant = 'standard' | 'premium';

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
};

export type UpdateRidePayload = {
  rideId: string;
  driver_id?: string;
  status?: RideStatus;
  ended_at?: string;
  actual_pickup_coords?: [number, number];
  actual_dropoff_coords?: [number, number];
};

export type UpdateRideSuccessResponse = {
  status: number;
  message: string;
  code: 'RIDE_UPDATED';
  data: {
    id: string;
    status: RideStatus;
    driver_id: string;
  };
};

export type UpdateRideErrorResponse = {
  status: number;
  error: string;
  message: string;
  code: string;
};

export type ApiRequestResponse<T> = {
  data: T | null;
  error: string | null;
};
