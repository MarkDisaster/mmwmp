/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   ServiceControllerUpdateStatusMutationRequest,
   ServiceControllerUpdateStatusMutationResponse,
   ServiceControllerUpdateStatusPathParams,
   ServiceControllerUpdateStatus404,
   ServiceControllerUpdateStatus409,
} from '../models/ServiceControllerUpdateStatus';

function getServiceControllerUpdateStatusUrl(id: ServiceControllerUpdateStatusPathParams['id']) {
   const res = { method: 'PATCH', url: `/services/${id}/status` as const };
   return res;
}

export async function serviceControllerUpdateStatus(
   id: ServiceControllerUpdateStatusPathParams['id'],
   data: ServiceControllerUpdateStatusMutationRequest,
   config: Partial<RequestConfig<ServiceControllerUpdateStatusMutationRequest>> & {
      client?: Client;
   } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      ServiceControllerUpdateStatusMutationResponse,
      ResponseErrorConfig<ServiceControllerUpdateStatus404 | ServiceControllerUpdateStatus409>,
      ServiceControllerUpdateStatusMutationRequest
   >({
      method: 'PATCH',
      url: getServiceControllerUpdateStatusUrl(id).url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
