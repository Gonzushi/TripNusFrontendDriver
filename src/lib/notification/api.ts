import Env from '@env';

const API_URL = Env.API_URL;

type AcceptRideRequest = {
  rideId: string;
};

type AcceptRideResponse = {
  status: number;
  code: string;
  message: string;
  error?: string;
  data?: {
    id: string;
    status: string;
  };
};

export async function acceptRideApi(
  access_token: string,
  request: AcceptRideRequest
): Promise<AcceptRideResponse> {
  const response = await fetch(`${API_URL}/ride/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${access_token}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Failed to accept ride');
  }

  return response.json();
}
