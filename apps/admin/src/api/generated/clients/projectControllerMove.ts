/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   ProjectControllerMoveMutationRequest,
   ProjectControllerMoveMutationResponse,
   ProjectControllerMovePathParams,
   ProjectControllerMove400,
   ProjectControllerMove404,
   ProjectControllerMove409,
} from '../models/ProjectControllerMove';

function getProjectControllerMoveUrl(id: ProjectControllerMovePathParams['id']) {
   const res = { method: 'POST', url: `/projects/${id}/move` as const };
   return res;
}

export async function projectControllerMove(
   id: ProjectControllerMovePathParams['id'],
   data: ProjectControllerMoveMutationRequest,
   config: Partial<RequestConfig<ProjectControllerMoveMutationRequest>> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      ProjectControllerMoveMutationResponse,
      ResponseErrorConfig<
         ProjectControllerMove400 | ProjectControllerMove404 | ProjectControllerMove409
      >,
      ProjectControllerMoveMutationRequest
   >({
      method: 'POST',
      url: getProjectControllerMoveUrl(id).url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
