/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type { RunnerScorePublicControllerFindTopPlayersQueryResponse } from '../models/RunnerScorePublicControllerFindTopPlayers';

function getRunnerScorePublicControllerFindTopPlayersUrl() {
   const res = { method: 'GET', url: `/public/runner-scores/top` as const };
   return res;
}

export async function runnerScorePublicControllerFindTopPlayers(
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      RunnerScorePublicControllerFindTopPlayersQueryResponse,
      ResponseErrorConfig<Error>,
      unknown
   >({
      method: 'GET',
      url: getRunnerScorePublicControllerFindTopPlayersUrl().url.toString(),
      ...requestConfig,
   });
   return res;
}
