/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type { UserControllerDeleteAvatarMutationResponse } from '../models/UserControllerDeleteAvatar';

function getUserControllerDeleteAvatarUrl() {
   const res = { method: 'DELETE', url: `/users/me/avatar` as const };
   return res;
}

export async function userControllerDeleteAvatar(
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      UserControllerDeleteAvatarMutationResponse,
      ResponseErrorConfig<Error>,
      unknown
   >({
      method: 'DELETE',
      url: getUserControllerDeleteAvatarUrl().url.toString(),
      ...requestConfig,
   });
   return res;
}
