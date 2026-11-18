/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   ProjectPublicControllerFindBySlugQueryResponse,
   ProjectPublicControllerFindBySlugPathParams,
   ProjectPublicControllerFindBySlugHeaderParams,
   ProjectPublicControllerFindBySlug404,
} from '../models/ProjectPublicControllerFindBySlug';

function getProjectPublicControllerFindBySlugUrl(
   slug: ProjectPublicControllerFindBySlugPathParams['slug'],
) {
   const res = { method: 'GET', url: `/public/projects/${slug}` as const };
   return res;
}

export async function projectPublicControllerFindBySlug(
   slug: ProjectPublicControllerFindBySlugPathParams['slug'],
   headers?: ProjectPublicControllerFindBySlugHeaderParams,
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      ProjectPublicControllerFindBySlugQueryResponse,
      ResponseErrorConfig<ProjectPublicControllerFindBySlug404>,
      unknown
   >({
      method: 'GET',
      url: getProjectPublicControllerFindBySlugUrl(slug).url.toString(),
      ...requestConfig,
      headers: { ...headers, ...requestConfig.headers },
   });
   return res;
}
