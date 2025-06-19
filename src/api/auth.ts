import { apiRequest } from './request';
import type { AuthData } from './types/auth';

export const registerApi = async (email: string, password: string) =>
  apiRequest<null, { email: string; password: string }>(
    '/auth/register',
    'POST',
    {
      body: { email, password },
    }
  );

export const resendActivationApi = async (email: string) =>
  apiRequest<null, { email: string }>('/auth/resend-activation', 'POST', {
    body: { email },
  });

export const loginApi = async (email: string, password: string) =>
  apiRequest<AuthData, { email: string; password: string }>(
    '/auth/login',
    'POST',
    {
      body: { email, password },
    }
  );

export const refreshTokenApi = async (refresh_token: string) =>
  apiRequest<AuthData, { refresh_token: string }>(
    '/auth/refresh-token',
    'POST',
    {
      body: { refresh_token },
    }
  );

export const logoutApi = async (accessToken: string) =>
  apiRequest<null, { scope: string }>('/auth/logout', 'POST', {
    accessToken,
    body: { scope: 'local' },
  });

export const changePasswordApi = async (
  type: string,
  tokenHash: string,
  password: string
) =>
  apiRequest<null, { type: string; tokenHash: string; password: string }>(
    '/auth/change-password',
    'POST',
    {
      body: { type, tokenHash, password },
    }
  );

export const forgotPasswordApi = async (email: string) =>
  apiRequest<null, { email: string }>(
    '/auth/reset-password-for-email',
    'POST',
    {
      body: { email },
    }
  );

export const updatePhoneApi = async (accessToken: string, phone: string) =>
  apiRequest<null, { phone: string }>('/auth/update-phone', 'POST', {
    accessToken,
    body: {
      phone: phone.trim().startsWith('+') ? phone.trim() : `+${phone.trim()}`,
    },
  });
