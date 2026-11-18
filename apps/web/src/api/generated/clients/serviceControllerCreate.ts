/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   ServiceControllerCreateMutationRequest,
   ServiceControllerCreateMutationResponse,
   ServiceControllerCreate409,
} from '../models/ServiceControllerCreate';

function getServiceControllerCreateUrl() {
   const res = { method: 'POST', url: `/services` as const };
   return res;
}

export async function serviceControllerCreate(
   data: ServiceControllerCreateMutationRequest,
   config: Partial<RequestConfig<ServiceControllerCreateMutationRequest>> & {
      client?: Client;
   } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      ServiceControllerCreateMutationResponse,
      ResponseErrorConfig<ServiceControllerCreate409>,
      ServiceControllerCreateMutationRequest
   >({
      method: 'POST',
      url: getServiceControllerCreateUrl().url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
