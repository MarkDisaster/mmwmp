/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   ProjectControllerGetPreviewUrlQueryResponse,
   ProjectControllerGetPreviewUrlPathParams,
   ProjectControllerGetPreviewUrlQueryParams,
   ProjectControllerGetPreviewUrl404,
} from '../models/ProjectControllerGetPreviewUrl';

function getProjectControllerGetPreviewUrlUrl(id: ProjectControllerGetPreviewUrlPathParams['id']) {
   const res = { method: 'GET', url: `/projects/${id}/preview-url` as const };
   return res;
}

export async function projectControllerGetPreviewUrl(
   id: ProjectControllerGetPreviewUrlPathParams['id'],
   params?: ProjectControllerGetPreviewUrlQueryParams,
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      ProjectControllerGetPreviewUrlQueryResponse,
      ResponseErrorConfig<ProjectControllerGetPreviewUrl404>,
      unknown
   >({
      method: 'GET',
      url: getProjectControllerGetPreviewUrlUrl(id).url.toString(),
      params,
      ...requestConfig,
   });
   return res;
}
