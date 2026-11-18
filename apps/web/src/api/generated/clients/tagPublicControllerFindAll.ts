/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   TagPublicControllerFindAllQueryResponse,
   TagPublicControllerFindAllQueryParams,
} from '../models/TagPublicControllerFindAll';

function getTagPublicControllerFindAllUrl() {
   const res = { method: 'GET', url: `/public/tags` as const };
   return res;
}

export async function tagPublicControllerFindAll(
   params?: TagPublicControllerFindAllQueryParams,
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      TagPublicControllerFindAllQueryResponse,
      ResponseErrorConfig<Error>,
      unknown
   >({
      method: 'GET',
      url: getTagPublicControllerFindAllUrl().url.toString(),
      params,
      ...requestConfig,
   });
   return res;
}
