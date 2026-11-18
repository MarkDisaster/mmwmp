/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   RoleControllerCreateMutationRequest,
   RoleControllerCreateMutationResponse,
} from '../models/RoleControllerCreate';

function getRoleControllerCreateUrl() {
   const res = { method: 'POST', url: `/roles` as const };
   return res;
}

export async function roleControllerCreate(
   data: RoleControllerCreateMutationRequest,
   config: Partial<RequestConfig<RoleControllerCreateMutationRequest>> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      RoleControllerCreateMutationResponse,
      ResponseErrorConfig<Error>,
      RoleControllerCreateMutationRequest
   >({
      method: 'POST',
      url: getRoleControllerCreateUrl().url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
