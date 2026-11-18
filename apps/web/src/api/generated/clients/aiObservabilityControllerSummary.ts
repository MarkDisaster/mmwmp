/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   AiObservabilityControllerSummaryQueryResponse,
   AiObservabilityControllerSummaryQueryParams,
} from '../models/AiObservabilityControllerSummary';

function getAiObservabilityControllerSummaryUrl() {
   const res = { method: 'GET', url: `/ai/observability/summary` as const };
   return res;
}

export async function aiObservabilityControllerSummary(
   params?: AiObservabilityControllerSummaryQueryParams,
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      AiObservabilityControllerSummaryQueryResponse,
      ResponseErrorConfig<Error>,
      unknown
   >({
      method: 'GET',
      url: getAiObservabilityControllerSummaryUrl().url.toString(),
      params,
      ...requestConfig,
   });
   return res;
}
