/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   ServiceControllerFindTrashedQueryResponse,
   ServiceControllerFindTrashedQueryParams,
} from '../models/ServiceControllerFindTrashed';

function getServiceControllerFindTrashedUrl() {
   const res = { method: 'GET', url: `/services/trash` as const };
   return res;
}

export async function serviceControllerFindTrashed(
   params?: ServiceControllerFindTrashedQueryParams,
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      ServiceControllerFindTrashedQueryResponse,
      ResponseErrorConfig<Error>,
      unknown
   >({
      method: 'GET',
      url: getServiceControllerFindTrashedUrl().url.toString(),
      params,
      ...requestConfig,
   });
   return res;
}
