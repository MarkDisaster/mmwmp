/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   RunnerScoreControllerRemoveMutationResponse,
   RunnerScoreControllerRemovePathParams,
   RunnerScoreControllerRemove404,
} from '../models/RunnerScoreControllerRemove';

function getRunnerScoreControllerRemoveUrl(id: RunnerScoreControllerRemovePathParams['id']) {
   const res = { method: 'DELETE', url: `/runner-scores/${id}` as const };
   return res;
}

export async function runnerScoreControllerRemove(
   id: RunnerScoreControllerRemovePathParams['id'],
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      RunnerScoreControllerRemoveMutationResponse,
      ResponseErrorConfig<RunnerScoreControllerRemove404>,
      unknown
   >({
      method: 'DELETE',
      url: getRunnerScoreControllerRemoveUrl(id).url.toString(),
      ...requestConfig,
   });
   return res;
}
