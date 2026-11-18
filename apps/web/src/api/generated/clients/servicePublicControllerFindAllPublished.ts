/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   ServicePublicControllerFindAllPublishedQueryResponse,
   ServicePublicControllerFindAllPublishedQueryParams,
   ServicePublicControllerFindAllPublishedHeaderParams,
} from '../models/ServicePublicControllerFindAllPublished';

function getServicePublicControllerFindAllPublishedUrl() {
   const res = { method: 'GET', url: `/public/services` as const };
   return res;
}

export async function servicePublicControllerFindAllPublished(
   params?: ServicePublicControllerFindAllPublishedQueryParams,
   headers?: ServicePublicControllerFindAllPublishedHeaderParams,
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      ServicePublicControllerFindAllPublishedQueryResponse,
      ResponseErrorConfig<Error>,
      unknown
   >({
      method: 'GET',
      url: getServicePublicControllerFindAllPublishedUrl().url.toString(),
      params,
      ...requestConfig,
      headers: { ...headers, ...requestConfig.headers },
   });
   return res;
}
