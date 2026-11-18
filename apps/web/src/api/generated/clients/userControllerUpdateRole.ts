/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   UserControllerUpdateRoleMutationRequest,
   UserControllerUpdateRoleMutationResponse,
   UserControllerUpdateRolePathParams,
   UserControllerUpdateRole400,
   UserControllerUpdateRole404,
} from '../models/UserControllerUpdateRole';

function getUserControllerUpdateRoleUrl(id: UserControllerUpdateRolePathParams['id']) {
   const res = { method: 'PATCH', url: `/users/${id}/role` as const };
   return res;
}

export async function userControllerUpdateRole(
   id: UserControllerUpdateRolePathParams['id'],
   data: UserControllerUpdateRoleMutationRequest,
   config: Partial<RequestConfig<UserControllerUpdateRoleMutationRequest>> & {
      client?: Client;
   } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      UserControllerUpdateRoleMutationResponse,
      ResponseErrorConfig<UserControllerUpdateRole400 | UserControllerUpdateRole404>,
      UserControllerUpdateRoleMutationRequest
   >({
      method: 'PATCH',
      url: getUserControllerUpdateRoleUrl(id).url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
