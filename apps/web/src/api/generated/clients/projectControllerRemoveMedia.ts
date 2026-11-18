/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   ProjectControllerRemoveMediaMutationResponse,
   ProjectControllerRemoveMediaPathParams,
   ProjectControllerRemoveMedia404,
} from '../models/ProjectControllerRemoveMedia';

function getProjectControllerRemoveMediaUrl(
   id: ProjectControllerRemoveMediaPathParams['id'],
   mediaId: ProjectControllerRemoveMediaPathParams['mediaId'],
) {
   const res = { method: 'DELETE', url: `/projects/${id}/media/${mediaId}` as const };
   return res;
}

export async function projectControllerRemoveMedia(
   id: ProjectControllerRemoveMediaPathParams['id'],
   mediaId: ProjectControllerRemoveMediaPathParams['mediaId'],
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      ProjectControllerRemoveMediaMutationResponse,
      ResponseErrorConfig<ProjectControllerRemoveMedia404>,
      unknown
   >({
      method: 'DELETE',
      url: getProjectControllerRemoveMediaUrl(id, mediaId).url.toString(),
      ...requestConfig,
   });
   return res;
}
