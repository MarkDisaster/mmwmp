/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   ProjectControllerFindTrashedQueryResponse,
   ProjectControllerFindTrashedQueryParams,
} from '../models/ProjectControllerFindTrashed';

function getProjectControllerFindTrashedUrl() {
   const res = { method: 'GET', url: `/projects/trash` as const };
   return res;
}

export async function projectControllerFindTrashed(
   params?: ProjectControllerFindTrashedQueryParams,
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      ProjectControllerFindTrashedQueryResponse,
      ResponseErrorConfig<Error>,
      unknown
   >({
      method: 'GET',
      url: getProjectControllerFindTrashedUrl().url.toString(),
      params,
      ...requestConfig,
   });
   return res;
}
