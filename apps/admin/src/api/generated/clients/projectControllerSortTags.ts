/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   ProjectControllerSortTagsMutationRequest,
   ProjectControllerSortTagsMutationResponse,
   ProjectControllerSortTagsPathParams,
   ProjectControllerSortTags404,
   ProjectControllerSortTags409,
} from '../models/ProjectControllerSortTags';

function getProjectControllerSortTagsUrl(id: ProjectControllerSortTagsPathParams['id']) {
   const res = { method: 'PUT', url: `/projects/${id}/tags/sort` as const };
   return res;
}

export async function projectControllerSortTags(
   id: ProjectControllerSortTagsPathParams['id'],
   data: ProjectControllerSortTagsMutationRequest,
   config: Partial<RequestConfig<ProjectControllerSortTagsMutationRequest>> & {
      client?: Client;
   } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      ProjectControllerSortTagsMutationResponse,
      ResponseErrorConfig<ProjectControllerSortTags404 | ProjectControllerSortTags409>,
      ProjectControllerSortTagsMutationRequest
   >({
      method: 'PUT',
      url: getProjectControllerSortTagsUrl(id).url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
