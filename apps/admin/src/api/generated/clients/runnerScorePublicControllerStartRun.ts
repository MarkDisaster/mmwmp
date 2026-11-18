/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   RunnerScorePublicControllerStartRunMutationResponse,
   RunnerScorePublicControllerStartRun429,
} from '../models/RunnerScorePublicControllerStartRun';

function getRunnerScorePublicControllerStartRunUrl() {
   const res = { method: 'POST', url: `/public/runner-scores/runs` as const };
   return res;
}

export async function runnerScorePublicControllerStartRun(
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      RunnerScorePublicControllerStartRunMutationResponse,
      ResponseErrorConfig<RunnerScorePublicControllerStartRun429>,
      unknown
   >({
      method: 'POST',
      url: getRunnerScorePublicControllerStartRunUrl().url.toString(),
      ...requestConfig,
   });
   return res;
}
