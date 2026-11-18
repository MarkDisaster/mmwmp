/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   UserControllerDeactivateMutationResponse,
   UserControllerDeactivatePathParams,
   UserControllerDeactivate400,
   UserControllerDeactivate403,
   UserControllerDeactivate404,
   UserControllerDeactivate409,
} from '../models/UserControllerDeactivate';

function getUserControllerDeactivateUrl(id: UserControllerDeactivatePathParams['id']) {
   const res = { method: 'PATCH', url: `/users/${id}/deactivate` as const };
   return res;
}

export async function userControllerDeactivate(
   id: UserControllerDeactivatePathParams['id'],
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      UserControllerDeactivateMutationResponse,
      ResponseErrorConfig<
         | UserControllerDeactivate400
         | UserControllerDeactivate403
         | UserControllerDeactivate404
         | UserControllerDeactivate409
      >,
      unknown
   >({ method: 'PATCH', url: getUserControllerDeactivateUrl(id).url.toString(), ...requestConfig });
   return res;
}
