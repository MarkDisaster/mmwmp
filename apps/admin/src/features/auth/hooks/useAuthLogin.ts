import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import type { AuthResponseEntity } from '@/api/generated';
import { saveAuthSession } from '@/features/auth/auth-query';
import { api } from '@/utils/axios';

export type LoginRateLimitError = {
   isRateLimited: true;
   retryAfterSeconds: number;
};

export const useAuthLogin = () => {
   const { t } = useTranslation();
   const [rateLimitError, setRateLimitError] = useState<LoginRateLimitError | null>(null);

   const mutation = useMutation({
      meta: { silent: true },
      mutationFn: async (data: { email: string; password: string }) => {
         setRateLimitError(null);
         const response = await api.post<AuthResponseEntity>('/auth/login', data);
         return response.data;
      },
      onSuccess: (data) => {
         saveAuthSession(data);
         toast.success(t('auth.toast.loginSuccess'));
      },
      onError: (error) => {
         if (axios.isAxiosError(error) && error.response?.status === 429) {
            const apiRetryAfter = (error.response.data as { retryAfterSeconds?: unknown })
               ?.retryAfterSeconds;
            const retryAfterSeconds = typeof apiRetryAfter === 'number' ? apiRetryAfter : undefined;
            setRateLimitError({
               isRateLimited: true,
               retryAfterSeconds: retryAfterSeconds ?? 900,
            });
            return;
         }
         toast.error(t('auth.toast.loginError'));
      },
   });

   return { ...mutation, rateLimitError };
};
