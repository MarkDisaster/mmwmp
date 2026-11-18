/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   ProjectPublicControllerFindAllPublishedQueryResponse,
   ProjectPublicControllerFindAllPublishedQueryParams,
   ProjectPublicControllerFindAllPublishedHeaderParams,
} from '../models/ProjectPublicControllerFindAllPublished';

function getProjectPublicControllerFindAllPublishedUrl() {
   const res = { method: 'GET', url: `/public/projects` as const };
   return res;
}

export async function projectPublicControllerFindAllPublished(
   params?: ProjectPublicControllerFindAllPublishedQueryParams,
   headers?: ProjectPublicControllerFindAllPublishedHeaderParams,
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      ProjectPublicControllerFindAllPublishedQueryResponse,
      ResponseErrorConfig<Error>,
      unknown
   >({
      method: 'GET',
      url: getProjectPublicControllerFindAllPublishedUrl().url.toString(),
      params,
      ...requestConfig,
      headers: { ...headers, ...requestConfig.headers },
   });
   return res;
}
