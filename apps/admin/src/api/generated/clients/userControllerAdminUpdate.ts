/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   UserControllerAdminUpdateMutationRequest,
   UserControllerAdminUpdateMutationResponse,
   UserControllerAdminUpdatePathParams,
   UserControllerAdminUpdate400,
   UserControllerAdminUpdate403,
   UserControllerAdminUpdate409,
} from '../models/UserControllerAdminUpdate';

function getUserControllerAdminUpdateUrl(id: UserControllerAdminUpdatePathParams['id']) {
   const res = { method: 'PATCH', url: `/users/${id}` as const };
   return res;
}

export async function userControllerAdminUpdate(
   id: UserControllerAdminUpdatePathParams['id'],
   data: UserControllerAdminUpdateMutationRequest,
   config: Partial<RequestConfig<UserControllerAdminUpdateMutationRequest>> & {
      client?: Client;
   } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      UserControllerAdminUpdateMutationResponse,
      ResponseErrorConfig<
         UserControllerAdminUpdate400 | UserControllerAdminUpdate403 | UserControllerAdminUpdate409
      >,
      UserControllerAdminUpdateMutationRequest
   >({
      method: 'PATCH',
      url: getUserControllerAdminUpdateUrl(id).url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
