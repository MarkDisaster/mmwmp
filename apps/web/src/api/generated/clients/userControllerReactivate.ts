/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   UserControllerReactivateMutationResponse,
   UserControllerReactivatePathParams,
   UserControllerReactivate403,
   UserControllerReactivate404,
   UserControllerReactivate409,
} from '../models/UserControllerReactivate';

function getUserControllerReactivateUrl(id: UserControllerReactivatePathParams['id']) {
   const res = { method: 'PATCH', url: `/users/${id}/reactivate` as const };
   return res;
}

export async function userControllerReactivate(
   id: UserControllerReactivatePathParams['id'],
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      UserControllerReactivateMutationResponse,
      ResponseErrorConfig<
         UserControllerReactivate403 | UserControllerReactivate404 | UserControllerReactivate409
      >,
      unknown
   >({ method: 'PATCH', url: getUserControllerReactivateUrl(id).url.toString(), ...requestConfig });
   return res;
}
