/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   ProjectControllerRemoveTagMutationResponse,
   ProjectControllerRemoveTagPathParams,
   ProjectControllerRemoveTag404,
} from '../models/ProjectControllerRemoveTag';

function getProjectControllerRemoveTagUrl(
   id: ProjectControllerRemoveTagPathParams['id'],
   tagId: ProjectControllerRemoveTagPathParams['tagId'],
) {
   const res = { method: 'DELETE', url: `/projects/${id}/tags/${tagId}` as const };
   return res;
}

export async function projectControllerRemoveTag(
   id: ProjectControllerRemoveTagPathParams['id'],
   tagId: ProjectControllerRemoveTagPathParams['tagId'],
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      ProjectControllerRemoveTagMutationResponse,
      ResponseErrorConfig<ProjectControllerRemoveTag404>,
      unknown
   >({
      method: 'DELETE',
      url: getProjectControllerRemoveTagUrl(id, tagId).url.toString(),
      ...requestConfig,
   });
   return res;
}
