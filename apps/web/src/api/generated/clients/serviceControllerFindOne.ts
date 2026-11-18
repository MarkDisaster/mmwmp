/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   ServiceControllerFindOneQueryResponse,
   ServiceControllerFindOnePathParams,
   ServiceControllerFindOne404,
} from '../models/ServiceControllerFindOne';

function getServiceControllerFindOneUrl(id: ServiceControllerFindOnePathParams['id']) {
   const res = { method: 'GET', url: `/services/${id}` as const };
   return res;
}

export async function serviceControllerFindOne(
   id: ServiceControllerFindOnePathParams['id'],
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      ServiceControllerFindOneQueryResponse,
      ResponseErrorConfig<ServiceControllerFindOne404>,
      unknown
   >({ method: 'GET', url: getServiceControllerFindOneUrl(id).url.toString(), ...requestConfig });
   return res;
}
