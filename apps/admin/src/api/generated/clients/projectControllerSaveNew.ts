/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   ProjectControllerSaveNewMutationRequest,
   ProjectControllerSaveNewMutationResponse,
   ProjectControllerSaveNew400,
   ProjectControllerSaveNew401,
   ProjectControllerSaveNew403,
   ProjectControllerSaveNew404,
   ProjectControllerSaveNew409,
} from '../models/ProjectControllerSaveNew';

function getProjectControllerSaveNewUrl() {
   const res = { method: 'POST', url: `/projects/save` as const };
   return res;
}

export async function projectControllerSaveNew(
   data: ProjectControllerSaveNewMutationRequest,
   config: Partial<RequestConfig<ProjectControllerSaveNewMutationRequest>> & {
      client?: Client;
   } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      ProjectControllerSaveNewMutationResponse,
      ResponseErrorConfig<
         | ProjectControllerSaveNew400
         | ProjectControllerSaveNew401
         | ProjectControllerSaveNew403
         | ProjectControllerSaveNew404
         | ProjectControllerSaveNew409
      >,
      ProjectControllerSaveNewMutationRequest
   >({
      method: 'POST',
      url: getProjectControllerSaveNewUrl().url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
