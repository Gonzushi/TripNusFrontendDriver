// src/api/driver/index.ts

import Env from '@env';

import { apiRequest } from './request';
import {
  type DriverProfile,
  type NearbyDriversResponse,
  type UploadDriverPictureResponse,
} from './types/driver';

const API_URL = Env.API_URL;

// Create driver profile
export const createDriverProfileApi = async (accessToken: string) => {
  return apiRequest<DriverProfile>('/driver/create-profile', 'POST', {
    accessToken,
  });
};

// Upload driver picture
export const uploadDriverPictureApi = async (
  accessToken: string,
  formData: FormData
): Promise<{
  data: UploadDriverPictureResponse | null;
  error: string | null;
}> => {
  const response = await fetch(`${API_URL}/driver/picture`, {
    method: 'PATCH',
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  const json = await response.json();

  return {
    data: response.ok ? (json.data as UploadDriverPictureResponse) : null,
    error: response.ok ? null : json.message || 'Upload failed',
  };
};

// Get driver profile
export const getDriverProfileApi = async (accessToken: string) => {
  return apiRequest<DriverProfile>('/driver/profile', 'GET', {
    accessToken,
  });
};

// Get nearby drivers
export const getNearbyDriversApi = async (
  accessToken: string,
  pickup: {
    latitude: number;
    longitude: number;
  }
) => {
  return apiRequest<
    NearbyDriversResponse,
    { pickup: { latitude: number; longitude: number } }
  >('/driver/nearby', 'POST', {
    accessToken,
    body: { pickup },
  });
};

// Update driver profile
export const updateDriverProfileApi = async (
  accessToken: string,
  updates: Partial<DriverProfile>
) => {
  return apiRequest<DriverProfile, Partial<DriverProfile>>(
    '/driver/profile',
    'PATCH',
    {
      accessToken,
      body: updates,
    }
  );
};
