/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   ProjectControllerSaveExistingMutationRequest,
   ProjectControllerSaveExistingMutationResponse,
   ProjectControllerSaveExistingPathParams,
   ProjectControllerSaveExisting400,
   ProjectControllerSaveExisting401,
   ProjectControllerSaveExisting403,
   ProjectControllerSaveExisting404,
   ProjectControllerSaveExisting409,
} from '../models/ProjectControllerSaveExisting';

function getProjectControllerSaveExistingUrl(id: ProjectControllerSaveExistingPathParams['id']) {
   const res = { method: 'PUT', url: `/projects/${id}/save` as const };
   return res;
}

export async function projectControllerSaveExisting(
   id: ProjectControllerSaveExistingPathParams['id'],
   data: ProjectControllerSaveExistingMutationRequest,
   config: Partial<RequestConfig<ProjectControllerSaveExistingMutationRequest>> & {
      client?: Client;
   } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      ProjectControllerSaveExistingMutationResponse,
      ResponseErrorConfig<
         | ProjectControllerSaveExisting400
         | ProjectControllerSaveExisting401
         | ProjectControllerSaveExisting403
         | ProjectControllerSaveExisting404
         | ProjectControllerSaveExisting409
      >,
      ProjectControllerSaveExistingMutationRequest
   >({
      method: 'PUT',
      url: getProjectControllerSaveExistingUrl(id).url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
