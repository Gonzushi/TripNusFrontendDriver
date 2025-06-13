// import { API_URL } from './constants';
import {
  type ApiRequestResponse,
  type RideData,
  type UpdateRidePayload,
  type UpdateRideSuccessResponse,
} from './types';

const API_URL = 'http://192.168.100.221:3000';

const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<ApiRequestResponse<T>> => {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });

    const apiOutput = await response.json();

    console.log('apiOutput', apiOutput);

    return {
      data: response.ok ? (apiOutput.data as T) : null,
      error: !response.ok ? apiOutput.message || 'Unknown error' : null,
    };
  } catch (error) {
    console.log('error', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Network error occurred',
    };
  }
};

export const getActiveRide = async (
  token: string,
  riderId: string
): Promise<ApiRequestResponse<RideData>> => {
  return apiRequest<RideData>(
    '/ride/active-ride',
    {
      method: 'POST',
      body: JSON.stringify({ riderId }),
    },
    token
  );
};

export const updateRide = async (
  token: string,
  payload: UpdateRidePayload
): Promise<ApiRequestResponse<UpdateRideSuccessResponse>> => {
  return apiRequest<UpdateRideSuccessResponse>(
    '/ride/update',
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    token
  );
};

export const confirmRide = async (
  token: string,
  rideId: string,
  driverId: string
): Promise<ApiRequestResponse<UpdateRideSuccessResponse>> => {
  return apiRequest<UpdateRideSuccessResponse>(
    '/ride/confirm',
    {
      method: 'POST',
      body: JSON.stringify({ ride_id: rideId, driver_id: driverId }),
    },
    token
  );
};
