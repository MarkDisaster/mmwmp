/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   AuthControllerForgotPasswordMutationRequest,
   AuthControllerForgotPasswordMutationResponse,
   AuthControllerForgotPassword429,
   AuthControllerForgotPassword503,
} from '../models/AuthControllerForgotPassword';

function getAuthControllerForgotPasswordUrl() {
   const res = { method: 'POST', url: `/auth/forgot-password` as const };
   return res;
}

export async function authControllerForgotPassword(
   data: AuthControllerForgotPasswordMutationRequest,
   config: Partial<RequestConfig<AuthControllerForgotPasswordMutationRequest>> & {
      client?: Client;
   } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      AuthControllerForgotPasswordMutationResponse,
      ResponseErrorConfig<AuthControllerForgotPassword429 | AuthControllerForgotPassword503>,
      AuthControllerForgotPasswordMutationRequest
   >({
      method: 'POST',
      url: getAuthControllerForgotPasswordUrl().url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
