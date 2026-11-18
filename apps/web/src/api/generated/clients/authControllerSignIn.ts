/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   AuthControllerSignInMutationRequest,
   AuthControllerSignInMutationResponse,
   AuthControllerSignIn401,
   AuthControllerSignIn429,
   AuthControllerSignIn503,
} from '../models/AuthControllerSignIn';

function getAuthControllerSignInUrl() {
   const res = { method: 'POST', url: `/auth/login` as const };
   return res;
}

export async function authControllerSignIn(
   data: AuthControllerSignInMutationRequest,
   config: Partial<RequestConfig<AuthControllerSignInMutationRequest>> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      AuthControllerSignInMutationResponse,
      ResponseErrorConfig<
         AuthControllerSignIn401 | AuthControllerSignIn429 | AuthControllerSignIn503
      >,
      AuthControllerSignInMutationRequest
   >({
      method: 'POST',
      url: getAuthControllerSignInUrl().url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
