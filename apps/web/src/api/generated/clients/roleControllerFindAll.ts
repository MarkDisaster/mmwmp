/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   RoleControllerFindAllQueryResponse,
   RoleControllerFindAllQueryParams,
} from '../models/RoleControllerFindAll';

function getRoleControllerFindAllUrl() {
   const res = { method: 'GET', url: `/roles` as const };
   return res;
}

export async function roleControllerFindAll(
   params?: RoleControllerFindAllQueryParams,
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      RoleControllerFindAllQueryResponse,
      ResponseErrorConfig<Error>,
      unknown
   >({
      method: 'GET',
      url: getRoleControllerFindAllUrl().url.toString(),
      params,
      ...requestConfig,
   });
   return res;
}
