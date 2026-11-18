/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   ServiceControllerSaveMutationRequest,
   ServiceControllerSaveMutationResponse,
   ServiceControllerSavePathParams,
   ServiceControllerSave400,
   ServiceControllerSave401,
   ServiceControllerSave403,
   ServiceControllerSave404,
   ServiceControllerSave409,
} from '../models/ServiceControllerSave';

function getServiceControllerSaveUrl(id: ServiceControllerSavePathParams['id']) {
   const res = { method: 'PUT', url: `/services/${id}/save` as const };
   return res;
}

export async function serviceControllerSave(
   id: ServiceControllerSavePathParams['id'],
   data: ServiceControllerSaveMutationRequest,
   config: Partial<RequestConfig<ServiceControllerSaveMutationRequest>> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      ServiceControllerSaveMutationResponse,
      ResponseErrorConfig<
         | ServiceControllerSave400
         | ServiceControllerSave401
         | ServiceControllerSave403
         | ServiceControllerSave404
         | ServiceControllerSave409
      >,
      ServiceControllerSaveMutationRequest
   >({
      method: 'PUT',
      url: getServiceControllerSaveUrl(id).url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
