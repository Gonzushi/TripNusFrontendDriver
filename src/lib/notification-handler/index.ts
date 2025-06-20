import { EventEmitter } from 'events';
import { type Router } from 'expo-router';

import {
  type NotificationData,
  type RideRequestData,
} from '../../types/ride-request';
import { handleRideRequest } from './ride-request-handler';

// Create a notification event emitter
export const notificationEmitter = new EventEmitter();

const NotificationHandler = (data: NotificationData, router: Router) => {
  if (data.type === 'NEW_RIDE_REQUEST') {
    handleRideRequest(data as RideRequestData, router);
  }

  if (data.type === 'ACCOUNT_DEACTIVATED_TEMPORARILY') {
    notificationEmitter.emit('account:suspended', data);
  }
};

export default NotificationHandler;
