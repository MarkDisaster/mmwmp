/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   RunnerScoreControllerFindAllQueryResponse,
   RunnerScoreControllerFindAllQueryParams,
} from '../models/RunnerScoreControllerFindAll';

function getRunnerScoreControllerFindAllUrl() {
   const res = { method: 'GET', url: `/runner-scores` as const };
   return res;
}

export async function runnerScoreControllerFindAll(
   params?: RunnerScoreControllerFindAllQueryParams,
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      RunnerScoreControllerFindAllQueryResponse,
      ResponseErrorConfig<Error>,
      unknown
   >({
      method: 'GET',
      url: getRunnerScoreControllerFindAllUrl().url.toString(),
      params,
      ...requestConfig,
   });
   return res;
}
