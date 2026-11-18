/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   ProjectControllerUpdateStatusMutationRequest,
   ProjectControllerUpdateStatusMutationResponse,
   ProjectControllerUpdateStatusPathParams,
   ProjectControllerUpdateStatus404,
   ProjectControllerUpdateStatus409,
} from '../models/ProjectControllerUpdateStatus';

function getProjectControllerUpdateStatusUrl(id: ProjectControllerUpdateStatusPathParams['id']) {
   const res = { method: 'PATCH', url: `/projects/${id}/status` as const };
   return res;
}

export async function projectControllerUpdateStatus(
   id: ProjectControllerUpdateStatusPathParams['id'],
   data: ProjectControllerUpdateStatusMutationRequest,
   config: Partial<RequestConfig<ProjectControllerUpdateStatusMutationRequest>> & {
      client?: Client;
   } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      ProjectControllerUpdateStatusMutationResponse,
      ResponseErrorConfig<ProjectControllerUpdateStatus404 | ProjectControllerUpdateStatus409>,
      ProjectControllerUpdateStatusMutationRequest
   >({
      method: 'PATCH',
      url: getProjectControllerUpdateStatusUrl(id).url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
