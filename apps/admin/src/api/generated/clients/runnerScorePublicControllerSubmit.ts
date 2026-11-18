/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   RunnerScorePublicControllerSubmitMutationRequest,
   RunnerScorePublicControllerSubmitMutationResponse,
   RunnerScorePublicControllerSubmit400,
   RunnerScorePublicControllerSubmit429,
} from '../models/RunnerScorePublicControllerSubmit';

function getRunnerScorePublicControllerSubmitUrl() {
   const res = { method: 'POST', url: `/public/runner-scores` as const };
   return res;
}

export async function runnerScorePublicControllerSubmit(
   data: RunnerScorePublicControllerSubmitMutationRequest,
   config: Partial<RequestConfig<RunnerScorePublicControllerSubmitMutationRequest>> & {
      client?: Client;
   } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      RunnerScorePublicControllerSubmitMutationResponse,
      ResponseErrorConfig<
         RunnerScorePublicControllerSubmit400 | RunnerScorePublicControllerSubmit429
      >,
      RunnerScorePublicControllerSubmitMutationRequest
   >({
      method: 'POST',
      url: getRunnerScorePublicControllerSubmitUrl().url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
