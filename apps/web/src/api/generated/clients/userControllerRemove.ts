/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   UserControllerRemoveMutationResponse,
   UserControllerRemovePathParams,
   UserControllerRemove403,
   UserControllerRemove404,
   UserControllerRemove409,
} from '../models/UserControllerRemove';

function getUserControllerRemoveUrl(id: UserControllerRemovePathParams['id']) {
   const res = { method: 'DELETE', url: `/users/${id}` as const };
   return res;
}

export async function userControllerRemove(
   id: UserControllerRemovePathParams['id'],
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      UserControllerRemoveMutationResponse,
      ResponseErrorConfig<
         UserControllerRemove403 | UserControllerRemove404 | UserControllerRemove409
      >,
      unknown
   >({ method: 'DELETE', url: getUserControllerRemoveUrl(id).url.toString(), ...requestConfig });
   return res;
}
