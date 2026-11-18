/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   ServiceControllerGetPreviewUrlQueryResponse,
   ServiceControllerGetPreviewUrlPathParams,
   ServiceControllerGetPreviewUrlQueryParams,
   ServiceControllerGetPreviewUrl404,
} from '../models/ServiceControllerGetPreviewUrl';

function getServiceControllerGetPreviewUrlUrl(id: ServiceControllerGetPreviewUrlPathParams['id']) {
   const res = { method: 'GET', url: `/services/${id}/preview-url` as const };
   return res;
}

export async function serviceControllerGetPreviewUrl(
   id: ServiceControllerGetPreviewUrlPathParams['id'],
   params?: ServiceControllerGetPreviewUrlQueryParams,
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      ServiceControllerGetPreviewUrlQueryResponse,
      ResponseErrorConfig<ServiceControllerGetPreviewUrl404>,
      unknown
   >({
      method: 'GET',
      url: getServiceControllerGetPreviewUrlUrl(id).url.toString(),
      params,
      ...requestConfig,
   });
   return res;
}
