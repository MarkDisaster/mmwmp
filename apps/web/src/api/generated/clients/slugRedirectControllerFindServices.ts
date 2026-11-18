/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   SlugRedirectControllerFindServicesQueryResponse,
   SlugRedirectControllerFindServicesQueryParams,
} from '../models/SlugRedirectControllerFindServices';

function getSlugRedirectControllerFindServicesUrl() {
   const res = { method: 'GET', url: `/slug-redirects/services` as const };
   return res;
}

export async function slugRedirectControllerFindServices(
   params?: SlugRedirectControllerFindServicesQueryParams,
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      SlugRedirectControllerFindServicesQueryResponse,
      ResponseErrorConfig<Error>,
      unknown
   >({
      method: 'GET',
      url: getSlugRedirectControllerFindServicesUrl().url.toString(),
      params,
      ...requestConfig,
   });
   return res;
}
