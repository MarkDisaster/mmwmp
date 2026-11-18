/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   RoleControllerRemoveMutationResponse,
   RoleControllerRemovePathParams,
} from '../models/RoleControllerRemove';

function getRoleControllerRemoveUrl(id: RoleControllerRemovePathParams['id']) {
   const res = { method: 'DELETE', url: `/roles/${id}` as const };
   return res;
}

export async function roleControllerRemove(
   id: RoleControllerRemovePathParams['id'],
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      RoleControllerRemoveMutationResponse,
      ResponseErrorConfig<Error>,
      unknown
   >({ method: 'DELETE', url: getRoleControllerRemoveUrl(id).url.toString(), ...requestConfig });
   return res;
}
