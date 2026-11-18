/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   RoleControllerUpdateMutationRequest,
   RoleControllerUpdateMutationResponse,
   RoleControllerUpdatePathParams,
} from '../models/RoleControllerUpdate';

function getRoleControllerUpdateUrl(id: RoleControllerUpdatePathParams['id']) {
   const res = { method: 'PATCH', url: `/roles/${id}` as const };
   return res;
}

export async function roleControllerUpdate(
   id: RoleControllerUpdatePathParams['id'],
   data: RoleControllerUpdateMutationRequest,
   config: Partial<RequestConfig<RoleControllerUpdateMutationRequest>> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      RoleControllerUpdateMutationResponse,
      ResponseErrorConfig<Error>,
      RoleControllerUpdateMutationRequest
   >({
      method: 'PATCH',
      url: getRoleControllerUpdateUrl(id).url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
