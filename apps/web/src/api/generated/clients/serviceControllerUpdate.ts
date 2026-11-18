/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   ServiceControllerUpdateMutationRequest,
   ServiceControllerUpdateMutationResponse,
   ServiceControllerUpdatePathParams,
   ServiceControllerUpdate404,
   ServiceControllerUpdate409,
} from '../models/ServiceControllerUpdate';

function getServiceControllerUpdateUrl(id: ServiceControllerUpdatePathParams['id']) {
   const res = { method: 'PATCH', url: `/services/${id}` as const };
   return res;
}

export async function serviceControllerUpdate(
   id: ServiceControllerUpdatePathParams['id'],
   data: ServiceControllerUpdateMutationRequest,
   config: Partial<RequestConfig<ServiceControllerUpdateMutationRequest>> & {
      client?: Client;
   } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      ServiceControllerUpdateMutationResponse,
      ResponseErrorConfig<ServiceControllerUpdate404 | ServiceControllerUpdate409>,
      ServiceControllerUpdateMutationRequest
   >({
      method: 'PATCH',
      url: getServiceControllerUpdateUrl(id).url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
