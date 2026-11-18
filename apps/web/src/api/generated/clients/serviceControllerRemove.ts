/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   ServiceControllerRemoveMutationResponse,
   ServiceControllerRemovePathParams,
   ServiceControllerRemove404,
} from '../models/ServiceControllerRemove';

function getServiceControllerRemoveUrl(id: ServiceControllerRemovePathParams['id']) {
   const res = { method: 'DELETE', url: `/services/${id}` as const };
   return res;
}

export async function serviceControllerRemove(
   id: ServiceControllerRemovePathParams['id'],
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      ServiceControllerRemoveMutationResponse,
      ResponseErrorConfig<ServiceControllerRemove404>,
      unknown
   >({ method: 'DELETE', url: getServiceControllerRemoveUrl(id).url.toString(), ...requestConfig });
   return res;
}
