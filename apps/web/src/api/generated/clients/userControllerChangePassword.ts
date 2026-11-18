/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   UserControllerChangePasswordMutationRequest,
   UserControllerChangePasswordMutationResponse,
   UserControllerChangePassword400,
} from '../models/UserControllerChangePassword';

function getUserControllerChangePasswordUrl() {
   const res = { method: 'PATCH', url: `/users/me/password` as const };
   return res;
}

export async function userControllerChangePassword(
   data: UserControllerChangePasswordMutationRequest,
   config: Partial<RequestConfig<UserControllerChangePasswordMutationRequest>> & {
      client?: Client;
   } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      UserControllerChangePasswordMutationResponse,
      ResponseErrorConfig<UserControllerChangePassword400>,
      UserControllerChangePasswordMutationRequest
   >({
      method: 'PATCH',
      url: getUserControllerChangePasswordUrl().url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
