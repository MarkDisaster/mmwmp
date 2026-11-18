/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   SlugRedirectControllerFindProjectsQueryResponse,
   SlugRedirectControllerFindProjectsQueryParams,
} from '../models/SlugRedirectControllerFindProjects';

function getSlugRedirectControllerFindProjectsUrl() {
   const res = { method: 'GET', url: `/slug-redirects/projects` as const };
   return res;
}

export async function slugRedirectControllerFindProjects(
   params?: SlugRedirectControllerFindProjectsQueryParams,
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      SlugRedirectControllerFindProjectsQueryResponse,
      ResponseErrorConfig<Error>,
      unknown
   >({
      method: 'GET',
      url: getSlugRedirectControllerFindProjectsUrl().url.toString(),
      params,
      ...requestConfig,
   });
   return res;
}
