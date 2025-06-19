import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

import { AUTH_STORAGE_KEY } from '@/constants';
import Env from '@/lib/env';

import { type ApiResponse } from './types/api';
import { type AuthData } from './types/auth';

const API_BASE_URL = Env.API_URL;

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

type RequestOptions<TBody> = {
  accessToken?: string;
  body?: TBody;
};

export async function apiRequest<TResponse, TBody = undefined>(
  path: string,
  method: HttpMethod,
  options: RequestOptions<TBody> = {}
): Promise<{ data: TResponse | null; error: string | null }> {
  const { accessToken, body } = options;

  const headers: Record<string, string> = {
    accept: 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  const makeRequest = async (token?: string) => {
    const finalHeaders = { ...headers };
    if (token) {
      finalHeaders['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: finalHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    const json: ApiResponse<TResponse> = await response.json();

    if (!response.ok) {
      return {
        status: response.status,
        data: null,
        error: json.error ?? json.message ?? 'Something went wrong',
      };
    }

    return { status: response.status, data: json.data ?? null, error: null };
  };

  try {
    const { status, data, error } = await makeRequest(accessToken);

    if (status === 401) {
      const rawState = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (!rawState) {
        await logout();
        return { data: null, error: 'Unauthorized' };
      }

      const storedState = JSON.parse(rawState) as {
        isLoggedIn: boolean;
        data: AuthData | null;
      };
      const refreshToken = storedState?.data?.session?.refresh_token;

      if (!refreshToken) {
        await logout();
        return { data: null, error: 'Unauthorized' };
      }

      // --- Inline refreshTokenApi logic here ---
      const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      const refreshJson: ApiResponse<AuthData> = await refreshRes.json();

      if (!refreshRes.ok || !refreshJson.data) {
        await logout();
        return { data: null, error: 'Session expired. Please log in again.' };
      }

      const refreshedData = refreshJson.data;

      // Save new session
      await AsyncStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({ isLoggedIn: true, data: refreshedData })
      );

      // Retry original request
      const retry = await makeRequest(refreshedData.session.access_token);
      return { data: retry.data, error: retry.error };
    }

    return { data, error };
  } catch (err) {
    return { data: null, error: (err as Error).message };
  }
}

async function logout() {
  // Clear auth state
  await AsyncStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({ isLoggedIn: false, data: null })
  );

  // Redirect to welcome
  router.replace('/welcome');
}
