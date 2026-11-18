/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   ProjectControllerAddMediaMutationRequest,
   ProjectControllerAddMediaMutationResponse,
   ProjectControllerAddMediaPathParams,
   ProjectControllerAddMedia404,
   ProjectControllerAddMedia409,
} from '../models/ProjectControllerAddMedia';

function getProjectControllerAddMediaUrl(id: ProjectControllerAddMediaPathParams['id']) {
   const res = { method: 'POST', url: `/projects/${id}/media` as const };
   return res;
}

export async function projectControllerAddMedia(
   id: ProjectControllerAddMediaPathParams['id'],
   data: ProjectControllerAddMediaMutationRequest,
   config: Partial<RequestConfig<ProjectControllerAddMediaMutationRequest>> & {
      client?: Client;
   } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      ProjectControllerAddMediaMutationResponse,
      ResponseErrorConfig<ProjectControllerAddMedia404 | ProjectControllerAddMedia409>,
      ProjectControllerAddMediaMutationRequest
   >({
      method: 'POST',
      url: getProjectControllerAddMediaUrl(id).url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
