import { apiRequest } from './request';
import {
  type ConfirmDropoffPayload,
  type ConfirmPaymentPayload,
  type ConfirmPickupPayload,
  type CreateRidePayload,
  type CreateRideResponse,
  type RideData,
  type RideDataDriver,
  type RideDataRider,
  type UpdateRidePayload,
} from './types/ride';

export const createRideApi = (
  accessToken: string,
  payload: CreateRidePayload
) =>
  apiRequest<CreateRideResponse, CreateRidePayload>('/ride/create', 'POST', {
    accessToken,
    body: payload,
  });

export const updateRideApi = (
  accessToken: string,
  payload: UpdateRidePayload
) =>
  apiRequest<RideData, UpdateRidePayload>('/ride/update', 'PATCH', {
    accessToken,
    body: payload,
  });

export const getRideRiderApi = (accessToken: string) =>
  apiRequest<RideDataRider>('/ride/active-ride-by-rider', 'GET', { accessToken });

export const getRideDriverApi = (accessToken: string) =>
  apiRequest<RideDataDriver>('/ride/active-ride-by-driver', 'GET', { accessToken });

export const confirmRideApi = (
  accessToken: string,
  payload: { ride_id: string; driver_id: string }
) =>
  apiRequest<undefined, typeof payload>('/ride/confirm', 'POST', {
    accessToken,
    body: payload,
  });

export const rejectRideApi = (
  accessToken: string,
  payload: { ride_id: string; driver_id: string }
) =>
  apiRequest<undefined, typeof payload>('/ride/reject', 'POST', {
    accessToken,
    body: payload,
  });

export const cancelByRiderApi = (
  accessToken: string,
  payload: { ride_id: string; rider_id: string }
) =>
  apiRequest<undefined, typeof payload>('/ride/cancel-by-rider', 'POST', {
    accessToken,
    body: payload,
  });

export const cancelByDriverApi = (
  accessToken: string,
  payload: { ride_id: string; driver_id: string }
) =>
  apiRequest<undefined, typeof payload>('/ride/cancel-by-driver', 'POST', {
    accessToken,
    body: payload,
  });

export const driverArrivedAtPickupApi = (
  accessToken: string,
  payload: { ride_id: string; driver_id: string }
) =>
  apiRequest<undefined, typeof payload>('/ride/driver-arrived', 'POST', {
    accessToken,
    body: payload,
  });

export const confirmPickupByDriverApi = (
  accessToken: string,
  payload: ConfirmPickupPayload
) =>
  apiRequest<undefined, ConfirmPickupPayload>('/ride/confirm-pickup', 'POST', {
    accessToken,
    body: payload,
  });

export const confirmDropoffByDriverApi = (
  accessToken: string,
  payload: ConfirmDropoffPayload
) =>
  apiRequest<undefined, ConfirmDropoffPayload>(
    '/ride/confirm-dropoff',
    'POST',
    {
      accessToken,
      body: payload,
    }
  );

export const confirmPaymentByDriverApi = (
  accessToken: string,
  payload: ConfirmPaymentPayload
) =>
  apiRequest<undefined, ConfirmPaymentPayload>(
    '/ride/confirm-payment-by-driver',
    'POST',
    {
      accessToken,
      body: payload,
    }
  );
