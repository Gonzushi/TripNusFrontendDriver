import { type Router } from 'expo-router';

import { calculateDuration } from '@/utils';

import { type RideRequestData } from '../notification-handler/types';

let lastRideRequestId: string | null = null;
let lastRequestTime = 0;

export const handleRideRequest = (data: RideRequestData, router: Router) => {
  // Simple duplicate guard using ID and timestamp
  const now = Date.now();
  if (data.ride_id === lastRideRequestId && now - lastRequestTime < 3000) {
    console.log('🔁 Duplicate ride request suppressed');
    return;
  }

  lastRideRequestId = data.ride_id;
  lastRequestTime = now;

  const duration = calculateDuration(data.distance_to_pickup_km);
  router.push({
    pathname: '/(protected)/active-ride/new-request',
    params: {
      data: JSON.stringify(data),
      pickupDistance: Math.round(data.distance_to_pickup_km),
      pickupDuration: Math.round(duration),
    },
  });
};
