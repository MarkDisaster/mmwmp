/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   UserControllerInviteMutationRequest,
   UserControllerInviteMutationResponse,
   UserControllerInvite409,
} from '../models/UserControllerInvite';

function getUserControllerInviteUrl() {
   const res = { method: 'POST', url: `/users/invitations` as const };
   return res;
}

export async function userControllerInvite(
   data: UserControllerInviteMutationRequest,
   config: Partial<RequestConfig<UserControllerInviteMutationRequest>> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      UserControllerInviteMutationResponse,
      ResponseErrorConfig<UserControllerInvite409>,
      UserControllerInviteMutationRequest
   >({
      method: 'POST',
      url: getUserControllerInviteUrl().url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
