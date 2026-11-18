/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   RunnerScoreControllerUpdateVisibilityMutationRequest,
   RunnerScoreControllerUpdateVisibilityMutationResponse,
   RunnerScoreControllerUpdateVisibilityPathParams,
   RunnerScoreControllerUpdateVisibility404,
} from '../models/RunnerScoreControllerUpdateVisibility';

function getRunnerScoreControllerUpdateVisibilityUrl(
   id: RunnerScoreControllerUpdateVisibilityPathParams['id'],
) {
   const res = { method: 'PATCH', url: `/runner-scores/${id}/visibility` as const };
   return res;
}

export async function runnerScoreControllerUpdateVisibility(
   id: RunnerScoreControllerUpdateVisibilityPathParams['id'],
   data: RunnerScoreControllerUpdateVisibilityMutationRequest,
   config: Partial<RequestConfig<RunnerScoreControllerUpdateVisibilityMutationRequest>> & {
      client?: Client;
   } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      RunnerScoreControllerUpdateVisibilityMutationResponse,
      ResponseErrorConfig<RunnerScoreControllerUpdateVisibility404>,
      RunnerScoreControllerUpdateVisibilityMutationRequest
   >({
      method: 'PATCH',
      url: getRunnerScoreControllerUpdateVisibilityUrl(id).url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
