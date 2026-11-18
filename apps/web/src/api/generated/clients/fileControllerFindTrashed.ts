/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   FileControllerFindTrashedQueryResponse,
   FileControllerFindTrashedQueryParams,
} from '../models/FileControllerFindTrashed';

function getFileControllerFindTrashedUrl() {
   const res = { method: 'GET', url: `/files/trash` as const };
   return res;
}

export async function fileControllerFindTrashed(
   params?: FileControllerFindTrashedQueryParams,
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      FileControllerFindTrashedQueryResponse,
      ResponseErrorConfig<Error>,
      unknown
   >({
      method: 'GET',
      url: getFileControllerFindTrashedUrl().url.toString(),
      params,
      ...requestConfig,
   });
   return res;
}
