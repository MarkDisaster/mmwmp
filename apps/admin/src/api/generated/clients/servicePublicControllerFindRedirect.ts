/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   ServicePublicControllerFindRedirectQueryResponse,
   ServicePublicControllerFindRedirectPathParams,
   ServicePublicControllerFindRedirect404,
} from '../models/ServicePublicControllerFindRedirect';

function getServicePublicControllerFindRedirectUrl(
   slug: ServicePublicControllerFindRedirectPathParams['slug'],
) {
   const res = { method: 'GET', url: `/public/services/redirect/${slug}` as const };
   return res;
}

export async function servicePublicControllerFindRedirect(
   slug: ServicePublicControllerFindRedirectPathParams['slug'],
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      ServicePublicControllerFindRedirectQueryResponse,
      ResponseErrorConfig<ServicePublicControllerFindRedirect404>,
      unknown
   >({
      method: 'GET',
      url: getServicePublicControllerFindRedirectUrl(slug).url.toString(),
      ...requestConfig,
   });
   return res;
}
