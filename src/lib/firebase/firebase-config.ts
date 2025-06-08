import Env from '@env';

import googleServicesJson from '../../../google-services.json';

type AndroidClientInfo = {
  client_info: {
    mobilesdk_app_id: string;
    android_client_info: {
      package_name: string;
    };
  };
  api_key: {
    current_key: string;
  }[];
};

type GoogleServices = {
  project_info: {
    project_number: string;
    project_id: string;
    storage_bucket: string;
  };
  client: AndroidClientInfo[];
};

const googleServices = googleServicesJson as GoogleServices;
const PACKAGE = Env.PACKAGE;

const matchingClient = googleServices.client.find(
  (client) => client.client_info.android_client_info.package_name === PACKAGE
);

if (!matchingClient) {
  throw new Error(`No matching Firebase client found for package: ${PACKAGE}`);
}

const firebaseConfig = {
  appId: matchingClient.client_info.mobilesdk_app_id,
  apiKey: matchingClient.api_key[0].current_key,
  projectId: googleServices.project_info.project_id,
  storageBucket: googleServices.project_info.storage_bucket,
  messagingSenderId: googleServices.project_info.project_number,
};

export default firebaseConfig;
