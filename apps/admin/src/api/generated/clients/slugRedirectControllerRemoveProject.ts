/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   SlugRedirectControllerRemoveProjectMutationResponse,
   SlugRedirectControllerRemoveProjectPathParams,
   SlugRedirectControllerRemoveProject404,
} from '../models/SlugRedirectControllerRemoveProject';

function getSlugRedirectControllerRemoveProjectUrl(
   id: SlugRedirectControllerRemoveProjectPathParams['id'],
) {
   const res = { method: 'DELETE', url: `/slug-redirects/projects/${id}` as const };
   return res;
}

export async function slugRedirectControllerRemoveProject(
   id: SlugRedirectControllerRemoveProjectPathParams['id'],
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      SlugRedirectControllerRemoveProjectMutationResponse,
      ResponseErrorConfig<SlugRedirectControllerRemoveProject404>,
      unknown
   >({
      method: 'DELETE',
      url: getSlugRedirectControllerRemoveProjectUrl(id).url.toString(),
      ...requestConfig,
   });
   return res;
}
