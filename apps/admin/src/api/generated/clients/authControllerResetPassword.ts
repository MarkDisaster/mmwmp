/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   AuthControllerResetPasswordMutationRequest,
   AuthControllerResetPasswordMutationResponse,
   AuthControllerResetPassword400,
} from '../models/AuthControllerResetPassword';

function getAuthControllerResetPasswordUrl() {
   const res = { method: 'POST', url: `/auth/reset-password` as const };
   return res;
}

export async function authControllerResetPassword(
   data: AuthControllerResetPasswordMutationRequest,
   config: Partial<RequestConfig<AuthControllerResetPasswordMutationRequest>> & {
      client?: Client;
   } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      AuthControllerResetPasswordMutationResponse,
      ResponseErrorConfig<AuthControllerResetPassword400>,
      AuthControllerResetPasswordMutationRequest
   >({
      method: 'POST',
      url: getAuthControllerResetPasswordUrl().url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
