/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   ServiceControllerRestoreMutationResponse,
   ServiceControllerRestorePathParams,
   ServiceControllerRestore404,
   ServiceControllerRestore409,
} from '../models/ServiceControllerRestore';

function getServiceControllerRestoreUrl(id: ServiceControllerRestorePathParams['id']) {
   const res = { method: 'POST', url: `/services/${id}/restore` as const };
   return res;
}

export async function serviceControllerRestore(
   id: ServiceControllerRestorePathParams['id'],
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      ServiceControllerRestoreMutationResponse,
      ResponseErrorConfig<ServiceControllerRestore404 | ServiceControllerRestore409>,
      unknown
   >({ method: 'POST', url: getServiceControllerRestoreUrl(id).url.toString(), ...requestConfig });
   return res;
}
