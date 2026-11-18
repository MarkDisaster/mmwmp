/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   ServiceControllerFindAllQueryResponse,
   ServiceControllerFindAllQueryParams,
} from '../models/ServiceControllerFindAll';

function getServiceControllerFindAllUrl() {
   const res = { method: 'GET', url: `/services` as const };
   return res;
}

export async function serviceControllerFindAll(
   params?: ServiceControllerFindAllQueryParams,
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      ServiceControllerFindAllQueryResponse,
      ResponseErrorConfig<Error>,
      unknown
   >({
      method: 'GET',
      url: getServiceControllerFindAllUrl().url.toString(),
      params,
      ...requestConfig,
   });
   return res;
}
