/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   ProjectPublicControllerFindRedirectQueryResponse,
   ProjectPublicControllerFindRedirectPathParams,
   ProjectPublicControllerFindRedirect404,
} from '../models/ProjectPublicControllerFindRedirect';

function getProjectPublicControllerFindRedirectUrl(
   slug: ProjectPublicControllerFindRedirectPathParams['slug'],
) {
   const res = { method: 'GET', url: `/public/projects/redirect/${slug}` as const };
   return res;
}

export async function projectPublicControllerFindRedirect(
   slug: ProjectPublicControllerFindRedirectPathParams['slug'],
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      ProjectPublicControllerFindRedirectQueryResponse,
      ResponseErrorConfig<ProjectPublicControllerFindRedirect404>,
      unknown
   >({
      method: 'GET',
      url: getProjectPublicControllerFindRedirectUrl(slug).url.toString(),
      ...requestConfig,
   });
   return res;
}
