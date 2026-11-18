/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   RoleControllerSetPermissionsMutationRequest,
   RoleControllerSetPermissionsMutationResponse,
   RoleControllerSetPermissionsPathParams,
   RoleControllerSetPermissions400,
   RoleControllerSetPermissions403,
} from '../models/RoleControllerSetPermissions';

function getRoleControllerSetPermissionsUrl(id: RoleControllerSetPermissionsPathParams['id']) {
   const res = { method: 'PUT', url: `/roles/${id}/permissions` as const };
   return res;
}

export async function roleControllerSetPermissions(
   id: RoleControllerSetPermissionsPathParams['id'],
   data: RoleControllerSetPermissionsMutationRequest,
   config: Partial<RequestConfig<RoleControllerSetPermissionsMutationRequest>> & {
      client?: Client;
   } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      RoleControllerSetPermissionsMutationResponse,
      ResponseErrorConfig<RoleControllerSetPermissions400 | RoleControllerSetPermissions403>,
      RoleControllerSetPermissionsMutationRequest
   >({
      method: 'PUT',
      url: getRoleControllerSetPermissionsUrl(id).url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
