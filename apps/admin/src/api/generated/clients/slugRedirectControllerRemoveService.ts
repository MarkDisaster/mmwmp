/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   SlugRedirectControllerRemoveServiceMutationResponse,
   SlugRedirectControllerRemoveServicePathParams,
   SlugRedirectControllerRemoveService404,
} from '../models/SlugRedirectControllerRemoveService';

function getSlugRedirectControllerRemoveServiceUrl(
   id: SlugRedirectControllerRemoveServicePathParams['id'],
) {
   const res = { method: 'DELETE', url: `/slug-redirects/services/${id}` as const };
   return res;
}

export async function slugRedirectControllerRemoveService(
   id: SlugRedirectControllerRemoveServicePathParams['id'],
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      SlugRedirectControllerRemoveServiceMutationResponse,
      ResponseErrorConfig<SlugRedirectControllerRemoveService404>,
      unknown
   >({
      method: 'DELETE',
      url: getSlugRedirectControllerRemoveServiceUrl(id).url.toString(),
      ...requestConfig,
   });
   return res;
}
