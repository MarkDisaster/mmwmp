/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   ProjectControllerFindAllQueryResponse,
   ProjectControllerFindAllQueryParams,
} from '../models/ProjectControllerFindAll';

function getProjectControllerFindAllUrl() {
   const res = { method: 'GET', url: `/projects` as const };
   return res;
}

export async function projectControllerFindAll(
   params?: ProjectControllerFindAllQueryParams,
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      ProjectControllerFindAllQueryResponse,
      ResponseErrorConfig<Error>,
      unknown
   >({
      method: 'GET',
      url: getProjectControllerFindAllUrl().url.toString(),
      params,
      ...requestConfig,
   });
   return res;
}
