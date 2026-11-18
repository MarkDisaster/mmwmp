/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   UserControllerFindAllQueryResponse,
   UserControllerFindAllQueryParams,
} from '../models/UserControllerFindAll';

function getUserControllerFindAllUrl() {
   const res = { method: 'GET', url: `/users` as const };
   return res;
}

export async function userControllerFindAll(
   params?: UserControllerFindAllQueryParams,
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      UserControllerFindAllQueryResponse,
      ResponseErrorConfig<Error>,
      unknown
   >({
      method: 'GET',
      url: getUserControllerFindAllUrl().url.toString(),
      params,
      ...requestConfig,
   });
   return res;
}
