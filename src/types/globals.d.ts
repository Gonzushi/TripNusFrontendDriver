// types/global.d.ts
import type { Socket } from 'socket.io-client';

/* eslint-disable no-var */
declare global {
  var __TRIPNUS_SOCKET__: Socket | null;
}
/* eslint-enable no-var */

export {};
