import Env from '@/lib/env';

import { type ApiResponse } from './types/api';

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

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const json: ApiResponse<TResponse> = await response.json();

    if (!response.ok) {
      return { data: null, error: json.error ?? json.message };
    }

    return { data: json.data ?? null, error: null };
  } catch (err) {
    return { data: null, error: (err as Error).message };
  }
}
