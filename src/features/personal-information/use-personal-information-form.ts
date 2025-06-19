import { useContext, useState } from 'react';

import { updatePhoneApi } from '@/api/auth';
import { updateDriverProfileApi } from '@/api/driver';
import { AuthContext } from '@/lib/auth';

interface FormData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export const usePersonalInformationForm = () => {
  const { authData, setAuthData } = useContext(AuthContext);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    firstName: authData?.driverFirstName || '',
    lastName: authData?.driverLastName || '',
    phoneNumber: authData?.phone || '',
  });

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      throw new Error('Nama depan wajib diisi');
    }

    if (!formData.phoneNumber.trim()) {
      throw new Error('Nomor telepon wajib diisi');
    }

    // Validate phone number format
    const phoneRegex = /^62[1-9][0-9]{8,11}$/;
    if (!phoneRegex.test(formData.phoneNumber.trim())) {
      throw new Error('Masukkan nomor telepon Indonesia yang valid');
    }
  };

  const handleUpdate = async () => {
    try {
      validateForm();
      setIsLoading(true);

      if (!authData?.session.access_token) {
        throw new Error('No access token found');
      }

      // Update profile (name)
      const { error: profileError } = await updateDriverProfileApi(
        authData?.session.access_token,
        {
          first_name: formData.firstName,
          last_name: formData.lastName,
        }
      );

      if (profileError) {
        throw new Error(profileError || 'Gagal memperbarui profil');
      }

      // Update phone number
      const { error: phoneError } = await updatePhoneApi(
        authData?.session.access_token,
        '+' + formData.phoneNumber.trim()
      );

      console.log('error', phoneError, phoneError);

      if (phoneError) {
        throw new Error(phoneError || 'Gagal memperbarui nomor telepon');
      }

      // Update local state
      if (authData && setAuthData) {
        const updatedAuthData = {
          ...authData,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim() || null,
          phone: formData.phoneNumber.trim(),
          user: {
            ...authData.user,
            phone: formData.phoneNumber.trim(),
          },
          session: {
            ...authData.session,
            user: {
              ...authData.session.user,
              phone: formData.phoneNumber.trim(),
            },
          },
        };
        await setAuthData(updatedAuthData);
      }

      return { success: true };
    } catch (error: unknown) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Gagal memperbarui profil',
      };
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: authData?.driverFirstName || '',
      lastName: authData?.driverLastName || '',
      phoneNumber: authData?.phone || '',
    });
    setIsEditing(false);
  };

  return {
    formData,
    setFormData,
    isEditing,
    setIsEditing,
    isLoading,
    handleUpdate,
    handleCancel,
  };
};
