/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   ServicePublicControllerFindBySlugQueryResponse,
   ServicePublicControllerFindBySlugPathParams,
   ServicePublicControllerFindBySlugHeaderParams,
   ServicePublicControllerFindBySlug404,
} from '../models/ServicePublicControllerFindBySlug';

function getServicePublicControllerFindBySlugUrl(
   slug: ServicePublicControllerFindBySlugPathParams['slug'],
) {
   const res = { method: 'GET', url: `/public/services/${slug}` as const };
   return res;
}

export async function servicePublicControllerFindBySlug(
   slug: ServicePublicControllerFindBySlugPathParams['slug'],
   headers?: ServicePublicControllerFindBySlugHeaderParams,
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      ServicePublicControllerFindBySlugQueryResponse,
      ResponseErrorConfig<ServicePublicControllerFindBySlug404>,
      unknown
   >({
      method: 'GET',
      url: getServicePublicControllerFindBySlugUrl(slug).url.toString(),
      ...requestConfig,
      headers: { ...headers, ...requestConfig.headers },
   });
   return res;
}
