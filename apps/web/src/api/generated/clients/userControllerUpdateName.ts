/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   UserControllerUpdateNameMutationRequest,
   UserControllerUpdateNameMutationResponse,
} from '../models/UserControllerUpdateName';

function getUserControllerUpdateNameUrl() {
   const res = { method: 'PATCH', url: `/users/me/name` as const };
   return res;
}

export async function userControllerUpdateName(
   data: UserControllerUpdateNameMutationRequest,
   config: Partial<RequestConfig<UserControllerUpdateNameMutationRequest>> & {
      client?: Client;
   } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      UserControllerUpdateNameMutationResponse,
      ResponseErrorConfig<Error>,
      UserControllerUpdateNameMutationRequest
   >({
      method: 'PATCH',
      url: getUserControllerUpdateNameUrl().url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
