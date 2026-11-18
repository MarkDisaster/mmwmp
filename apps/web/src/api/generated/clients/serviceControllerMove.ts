/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   ServiceControllerMoveMutationRequest,
   ServiceControllerMoveMutationResponse,
   ServiceControllerMovePathParams,
   ServiceControllerMove400,
   ServiceControllerMove404,
   ServiceControllerMove409,
} from '../models/ServiceControllerMove';

function getServiceControllerMoveUrl(id: ServiceControllerMovePathParams['id']) {
   const res = { method: 'POST', url: `/services/${id}/move` as const };
   return res;
}

export async function serviceControllerMove(
   id: ServiceControllerMovePathParams['id'],
   data: ServiceControllerMoveMutationRequest,
   config: Partial<RequestConfig<ServiceControllerMoveMutationRequest>> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      ServiceControllerMoveMutationResponse,
      ResponseErrorConfig<
         ServiceControllerMove400 | ServiceControllerMove404 | ServiceControllerMove409
      >,
      ServiceControllerMoveMutationRequest
   >({
      method: 'POST',
      url: getServiceControllerMoveUrl(id).url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
