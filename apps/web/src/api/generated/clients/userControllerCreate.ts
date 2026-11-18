/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   UserControllerCreateMutationRequest,
   UserControllerCreateMutationResponse,
   UserControllerCreate409,
} from '../models/UserControllerCreate';

function getUserControllerCreateUrl() {
   const res = { method: 'POST', url: `/users` as const };
   return res;
}

export async function userControllerCreate(
   data: UserControllerCreateMutationRequest,
   config: Partial<RequestConfig<UserControllerCreateMutationRequest>> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      UserControllerCreateMutationResponse,
      ResponseErrorConfig<UserControllerCreate409>,
      UserControllerCreateMutationRequest
   >({
      method: 'POST',
      url: getUserControllerCreateUrl().url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
