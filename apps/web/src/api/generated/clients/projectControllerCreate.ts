/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   ProjectControllerCreateMutationRequest,
   ProjectControllerCreateMutationResponse,
} from '../models/ProjectControllerCreate';

function getProjectControllerCreateUrl() {
   const res = { method: 'POST', url: `/projects` as const };
   return res;
}

export async function projectControllerCreate(
   data: ProjectControllerCreateMutationRequest,
   config: Partial<RequestConfig<ProjectControllerCreateMutationRequest>> & {
      client?: Client;
   } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      ProjectControllerCreateMutationResponse,
      ResponseErrorConfig<Error>,
      ProjectControllerCreateMutationRequest
   >({
      method: 'POST',
      url: getProjectControllerCreateUrl().url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
