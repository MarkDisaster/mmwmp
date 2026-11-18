/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   RoleControllerFindOneQueryResponse,
   RoleControllerFindOnePathParams,
} from '../models/RoleControllerFindOne';

function getRoleControllerFindOneUrl(id: RoleControllerFindOnePathParams['id']) {
   const res = { method: 'GET', url: `/roles/${id}` as const };
   return res;
}

export async function roleControllerFindOne(
   id: RoleControllerFindOnePathParams['id'],
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      RoleControllerFindOneQueryResponse,
      ResponseErrorConfig<Error>,
      unknown
   >({ method: 'GET', url: getRoleControllerFindOneUrl(id).url.toString(), ...requestConfig });
   return res;
}
