/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   ProjectControllerSortMediaMutationRequest,
   ProjectControllerSortMediaMutationResponse,
   ProjectControllerSortMediaPathParams,
   ProjectControllerSortMedia404,
   ProjectControllerSortMedia409,
} from '../models/ProjectControllerSortMedia';

function getProjectControllerSortMediaUrl(id: ProjectControllerSortMediaPathParams['id']) {
   const res = { method: 'PUT', url: `/projects/${id}/media/sort` as const };
   return res;
}

export async function projectControllerSortMedia(
   id: ProjectControllerSortMediaPathParams['id'],
   data: ProjectControllerSortMediaMutationRequest,
   config: Partial<RequestConfig<ProjectControllerSortMediaMutationRequest>> & {
      client?: Client;
   } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      ProjectControllerSortMediaMutationResponse,
      ResponseErrorConfig<ProjectControllerSortMedia404 | ProjectControllerSortMedia409>,
      ProjectControllerSortMediaMutationRequest
   >({
      method: 'PUT',
      url: getProjectControllerSortMediaUrl(id).url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
