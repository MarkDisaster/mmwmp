/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   AiObservabilityControllerListQueryResponse,
   AiObservabilityControllerListQueryParams,
} from '../models/AiObservabilityControllerList';

function getAiObservabilityControllerListUrl() {
   const res = { method: 'GET', url: `/ai/observability/interactions` as const };
   return res;
}

export async function aiObservabilityControllerList(
   params?: AiObservabilityControllerListQueryParams,
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      AiObservabilityControllerListQueryResponse,
      ResponseErrorConfig<Error>,
      unknown
   >({
      method: 'GET',
      url: getAiObservabilityControllerListUrl().url.toString(),
      params,
      ...requestConfig,
   });
   return res;
}
