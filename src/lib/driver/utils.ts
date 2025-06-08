import { type ProfileFormData } from './types';

export const validateProfileForm = (data: ProfileFormData): string | null => {
  if (!data.firstName.trim()) {
    return 'Nama depan wajib diisi';
  }

  if (!data.phoneNumber.trim()) {
    return 'Nomor telepon wajib diisi';
  }

  // Validate phone number format
  const phoneRegex = /^\+62[1-9][0-9]{8,11}$/;
  if (!phoneRegex.test(data.phoneNumber.trim())) {
    return 'Masukkan nomor telepon Indonesia yang valid dimulai dengan +62';
  }

  return null;
};
