/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   AuthControllerRefreshMutationRequest,
   AuthControllerRefreshMutationResponse,
   AuthControllerRefresh401,
} from '../models/AuthControllerRefresh';

function getAuthControllerRefreshUrl() {
   const res = { method: 'POST', url: `/auth/refresh` as const };
   return res;
}

export async function authControllerRefresh(
   data: AuthControllerRefreshMutationRequest,
   config: Partial<RequestConfig<AuthControllerRefreshMutationRequest>> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      AuthControllerRefreshMutationResponse,
      ResponseErrorConfig<AuthControllerRefresh401>,
      AuthControllerRefreshMutationRequest
   >({
      method: 'POST',
      url: getAuthControllerRefreshUrl().url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
