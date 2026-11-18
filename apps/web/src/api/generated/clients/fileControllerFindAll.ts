/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   FileControllerFindAllQueryResponse,
   FileControllerFindAllQueryParams,
   FileControllerFindAll400,
} from '../models/FileControllerFindAll';

function getFileControllerFindAllUrl() {
   const res = { method: 'GET', url: `/files` as const };
   return res;
}

export async function fileControllerFindAll(
   params?: FileControllerFindAllQueryParams,
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      FileControllerFindAllQueryResponse,
      ResponseErrorConfig<FileControllerFindAll400>,
      unknown
   >({
      method: 'GET',
      url: getFileControllerFindAllUrl().url.toString(),
      params,
      ...requestConfig,
   });
   return res;
}
