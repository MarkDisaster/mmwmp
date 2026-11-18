/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   ProjectControllerAssignLinksMutationRequest,
   ProjectControllerAssignLinksMutationResponse,
   ProjectControllerAssignLinksPathParams,
   ProjectControllerAssignLinks404,
   ProjectControllerAssignLinks409,
} from '../models/ProjectControllerAssignLinks';

function getProjectControllerAssignLinksUrl(id: ProjectControllerAssignLinksPathParams['id']) {
   const res = { method: 'PUT', url: `/projects/${id}/links` as const };
   return res;
}

export async function projectControllerAssignLinks(
   id: ProjectControllerAssignLinksPathParams['id'],
   data: ProjectControllerAssignLinksMutationRequest,
   config: Partial<RequestConfig<ProjectControllerAssignLinksMutationRequest>> & {
      client?: Client;
   } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      ProjectControllerAssignLinksMutationResponse,
      ResponseErrorConfig<ProjectControllerAssignLinks404 | ProjectControllerAssignLinks409>,
      ProjectControllerAssignLinksMutationRequest
   >({
      method: 'PUT',
      url: getProjectControllerAssignLinksUrl(id).url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
