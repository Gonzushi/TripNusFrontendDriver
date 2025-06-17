export const BACKGROUND_LOCATION_TASK = 'background-location-task';
export const DRIVER_LOCATION_KEY = 'driver-location';

export const SAVE_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
export const MAX_CACHE_AGE_MS = 30 * 60 * 1000;
export const LOCATION_UPDATE_INTERVAL = 60 * 1000; // 60 seconds
export const DISTANCE_UPDATE_INTERVAL = 50; // 100 meters

export const API_URL = 'https://ws.trip-nus.com/driver';

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
