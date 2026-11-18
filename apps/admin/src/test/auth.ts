import { api } from '@/api';
import type { UserEntity } from '@/api/generated';
import { AUTH_QUERY_KEY } from '@/features/auth/auth-query';
import { queryClient } from '@/utils/query-client';

export const signInAs = (user: UserEntity) => {
   queryClient.setQueryData(AUTH_QUERY_KEY, {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: '2999-01-01T00:00:00.000Z',
   });
   queryClient.setQueryData(api.users.queries.me.queryKey, user);
};
