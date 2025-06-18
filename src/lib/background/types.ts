export type AvailabilityStatus =
  | 'not_available'
  | 'available'
  | 'en_route_to_pickup'
  | 'waiting_at_pickup'
  | 'en_route_to_drop_off';

export type DriverData = {
  role?: 'driver';
  availabilityStatus?: AvailabilityStatus;
  id?: string;
  lat?: number | null;
  lng?: number | null;
  vehicle_type?: 'motorcycle' | 'car' | 'unknown';
  update_via?: 'websocket' | 'api' | 'mobile_app';
  last_updated_at?: string;
  speed_kph?: number;
  heading_deg?: number;
  accuracy_m?: number;
};
