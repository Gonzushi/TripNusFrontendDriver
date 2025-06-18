export const BACKGROUND_LOCATION_TASK = 'background-location-task';
export const DRIVER_LOCATION_KEY = 'driver-location';
export const DRIVER_AVAILABILITY_STATUS_KEY = 'driver-availability-status';
export const PICK_UP_LOCATION_KEY = 'pick-up-location';


export const SAVE_INTERVAL_MS = 2 * 60 * 1000; 
export const MAX_CACHE_AGE_MS = 2 * 60 * 1000; 

export const LOCATION_UPDATE_INTERVAL_MS = 60 * 1000; // 60 seconds
export const DISTANCE_UPDATE_INTERVAL_M = 100; // 100 meters
export const NEAR_LOCATION_UPDATE_INTERVAL_MS = 30 * 1000; // 30 seconds
export const NEAR_DISTANCE_UPDATE_INTERVAL_M = 20; // 20 meters

export const API_URL = 'https://ws.trip-nus.com/driver';
// export const API_URL = 'http://localhost:3001/driver';


export const DEBUG_MODE = false;

export const INTERNAL_SOCKET_EVENTS = [
    'connect',
    'disconnect',
    'connect_error',
    'reconnect',
    'reconnect_attempt',
    'reconnect_failed',
    'ping',
    'pong',
  ];
