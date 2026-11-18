/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   ProjectControllerAssignTagsMutationRequest,
   ProjectControllerAssignTagsMutationResponse,
   ProjectControllerAssignTagsPathParams,
   ProjectControllerAssignTags404,
   ProjectControllerAssignTags409,
} from '../models/ProjectControllerAssignTags';

function getProjectControllerAssignTagsUrl(id: ProjectControllerAssignTagsPathParams['id']) {
   const res = { method: 'POST', url: `/projects/${id}/tags` as const };
   return res;
}

export async function projectControllerAssignTags(
   id: ProjectControllerAssignTagsPathParams['id'],
   data: ProjectControllerAssignTagsMutationRequest,
   config: Partial<RequestConfig<ProjectControllerAssignTagsMutationRequest>> & {
      client?: Client;
   } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      ProjectControllerAssignTagsMutationResponse,
      ResponseErrorConfig<ProjectControllerAssignTags404 | ProjectControllerAssignTags409>,
      ProjectControllerAssignTagsMutationRequest
   >({
      method: 'POST',
      url: getProjectControllerAssignTagsUrl(id).url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
