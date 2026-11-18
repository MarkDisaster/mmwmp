/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   AuthControllerLogoutMutationRequest,
   AuthControllerLogoutMutationResponse,
} from '../models/AuthControllerLogout';

function getAuthControllerLogoutUrl() {
   const res = { method: 'POST', url: `/auth/logout` as const };
   return res;
}

export async function authControllerLogout(
   data: AuthControllerLogoutMutationRequest,
   config: Partial<RequestConfig<AuthControllerLogoutMutationRequest>> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      AuthControllerLogoutMutationResponse,
      ResponseErrorConfig<Error>,
      AuthControllerLogoutMutationRequest
   >({
      method: 'POST',
      url: getAuthControllerLogoutUrl().url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
