/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   RunnerScorePublicControllerFindRankQueryResponse,
   RunnerScorePublicControllerFindRankQueryParams,
   RunnerScorePublicControllerFindRank400,
} from '../models/RunnerScorePublicControllerFindRank';

function getRunnerScorePublicControllerFindRankUrl() {
   const res = { method: 'GET', url: `/public/runner-scores/rank` as const };
   return res;
}

export async function runnerScorePublicControllerFindRank(
   params: RunnerScorePublicControllerFindRankQueryParams,
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      RunnerScorePublicControllerFindRankQueryResponse,
      ResponseErrorConfig<RunnerScorePublicControllerFindRank400>,
      unknown
   >({
      method: 'GET',
      url: getRunnerScorePublicControllerFindRankUrl().url.toString(),
      params,
      ...requestConfig,
   });
   return res;
}
