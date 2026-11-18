/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   ServiceControllerSaveNewMutationRequest,
   ServiceControllerSaveNewMutationResponse,
   ServiceControllerSaveNew400,
   ServiceControllerSaveNew401,
   ServiceControllerSaveNew403,
   ServiceControllerSaveNew404,
   ServiceControllerSaveNew409,
} from '../models/ServiceControllerSaveNew';

function getServiceControllerSaveNewUrl() {
   const res = { method: 'POST', url: `/services/save` as const };
   return res;
}

export async function serviceControllerSaveNew(
   data: ServiceControllerSaveNewMutationRequest,
   config: Partial<RequestConfig<ServiceControllerSaveNewMutationRequest>> & {
      client?: Client;
   } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      ServiceControllerSaveNewMutationResponse,
      ResponseErrorConfig<
         | ServiceControllerSaveNew400
         | ServiceControllerSaveNew401
         | ServiceControllerSaveNew403
         | ServiceControllerSaveNew404
         | ServiceControllerSaveNew409
      >,
      ServiceControllerSaveNewMutationRequest
   >({
      method: 'POST',
      url: getServiceControllerSaveNewUrl().url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
