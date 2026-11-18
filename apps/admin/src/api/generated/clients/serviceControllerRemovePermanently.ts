/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   ServiceControllerRemovePermanentlyMutationResponse,
   ServiceControllerRemovePermanentlyPathParams,
   ServiceControllerRemovePermanently404,
} from '../models/ServiceControllerRemovePermanently';

function getServiceControllerRemovePermanentlyUrl(
   id: ServiceControllerRemovePermanentlyPathParams['id'],
) {
   const res = { method: 'DELETE', url: `/services/${id}/permanent` as const };
   return res;
}

export async function serviceControllerRemovePermanently(
   id: ServiceControllerRemovePermanentlyPathParams['id'],
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      ServiceControllerRemovePermanentlyMutationResponse,
      ResponseErrorConfig<ServiceControllerRemovePermanently404>,
      unknown
   >({
      method: 'DELETE',
      url: getServiceControllerRemovePermanentlyUrl(id).url.toString(),
      ...requestConfig,
   });
   return res;
}
