/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   UserControllerUpdateAvatarMutationResponse,
   UserControllerUpdateAvatar413,
} from '../models/UserControllerUpdateAvatar';

function getUserControllerUpdateAvatarUrl() {
   const res = { method: 'PATCH', url: `/users/me/avatar` as const };
   return res;
}

export async function userControllerUpdateAvatar(
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      UserControllerUpdateAvatarMutationResponse,
      ResponseErrorConfig<UserControllerUpdateAvatar413>,
      unknown
   >({ method: 'PATCH', url: getUserControllerUpdateAvatarUrl().url.toString(), ...requestConfig });
   return res;
}
