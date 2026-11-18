import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { api } from '@/api';
import type { AuthResponseEntity } from '@/api/generated';
import { AUTH_QUERY_KEY, endAuthSession, getAuthSession } from '@/features/auth/auth-query';
import { revokeSession } from '@/utils/axios';

const USER_STALE_TIME_MS = 5 * 60 * 1000;

export const useAuth = () => {
   const { t } = useTranslation();

   const { data: authData } = useQuery<AuthResponseEntity | null>({
      queryKey: AUTH_QUERY_KEY,
      queryFn: () => getAuthSession() ?? null,
      staleTime: Infinity,
   });

   const {
      data: user,
      isLoading: isUserLoading,
      isError: isUserError,
   } = useQuery({
      ...api.users.queries.me,
      enabled: !!authData?.accessToken,
      staleTime: USER_STALE_TIME_MS,
   });

   const logout = useCallback(async () => {
      await revokeSession().catch(() => undefined);
      endAuthSession({ reason: 'logout' });
      toast.success(t('auth.toast.logoutSuccess'));
   }, [t]);

   return {
      user: user ?? null,
      isUserLoading,
      isUserError,
      isAuthenticated: !!authData?.accessToken,
      logout,
   };
};
