import { Redirect } from 'expo-router';
import { useContext } from 'react';

import { AuthContext } from './auth-context';

export default function AuthCheck({ children }: { children: React.ReactNode }) {
  const authState = useContext(AuthContext);

  if (authState.authData) {
    authState.checkAndRefreshToken(authState.authData);
  }

  if (!authState.isReady) {
    return null;
  }

  if (!authState.isLoggedIn) {
    return <Redirect href="/welcome" />;
  }

  if (!authState.authData?.driverId) {
    return <Redirect href="/profile-setup-1" />;
  }

  if (
    !authState.authData?.driverFirstName ||
    !authState.authData?.driverLastName ||
    !authState.authData?.phone
  ) {
    return <Redirect href="/profile-setup-2" />;
  }

  if (!authState.authData?.driverStatus) {
    return <Redirect href="/profile-setup-3" />;
  }

  if (
    authState.authData?.driverStatus &&
    authState.authData?.driverStatus != 'confirmed'
  ) {
    return <Redirect href="/profile-setup-4" />;
  }

  return children;
}
