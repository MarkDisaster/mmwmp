/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   ProjectControllerUpdateMutationRequest,
   ProjectControllerUpdateMutationResponse,
   ProjectControllerUpdatePathParams,
   ProjectControllerUpdate404,
   ProjectControllerUpdate409,
} from '../models/ProjectControllerUpdate';

function getProjectControllerUpdateUrl(id: ProjectControllerUpdatePathParams['id']) {
   const res = { method: 'PATCH', url: `/projects/${id}` as const };
   return res;
}

export async function projectControllerUpdate(
   id: ProjectControllerUpdatePathParams['id'],
   data: ProjectControllerUpdateMutationRequest,
   config: Partial<RequestConfig<ProjectControllerUpdateMutationRequest>> & {
      client?: Client;
   } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      ProjectControllerUpdateMutationResponse,
      ResponseErrorConfig<ProjectControllerUpdate404 | ProjectControllerUpdate409>,
      ProjectControllerUpdateMutationRequest
   >({
      method: 'PATCH',
      url: getProjectControllerUpdateUrl(id).url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
