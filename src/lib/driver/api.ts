import Env from '@/lib/env';

import {
  type CreateRiderResponse,
  type UpdateDriverProfileData,
  type UpdateDriverProfileResponse,
  type UpdatePhoneResponse,
  type UploadPhotoResponse,
} from './types';

const API_BASE_URL = Env.API_URL;

export const updatePhoneApi = async (
  accessToken: string,
  phone: string
): Promise<UpdatePhoneResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/update-phone`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone: phone.trim(),
    }),
  });

  return response.json();
};

export const createDriverProfileApi = async (
  accessToken: string
): Promise<CreateRiderResponse> => {
  const response = await fetch(`${API_BASE_URL}/driver/profile`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.json();
};

export const uploadDriverPhotoApi = async (
  accessToken: string,
  formData: FormData
): Promise<UploadPhotoResponse> => {
  const response = await fetch(`${API_BASE_URL}/driver/picture`, {
    method: 'PATCH',
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  return response.json();
};

export const updateDriverProfileApi = async (
  accessToken: string,
  profileData: UpdateDriverProfileData
): Promise<UpdateDriverProfileResponse> => {
  const response = await fetch(`${API_BASE_URL}/driver/profile`, {
    method: 'PATCH',
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profileData),
  });

  return response.json();
};

export const getDriverProfileApi = async (accessToken: string) => {
  const response = await fetch(`${API_BASE_URL}/driver/profile`, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.json();
};
