/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type { UserControllerGetMeQueryResponse } from '../models/UserControllerGetMe';

function getUserControllerGetMeUrl() {
   const res = { method: 'GET', url: `/users/me` as const };
   return res;
}

export async function userControllerGetMe(
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<UserControllerGetMeQueryResponse, ResponseErrorConfig<Error>, unknown>(
      { method: 'GET', url: getUserControllerGetMeUrl().url.toString(), ...requestConfig },
   );
   return res;
}
