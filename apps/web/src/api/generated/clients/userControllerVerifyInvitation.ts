/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   UserControllerVerifyInvitationMutationResponse,
   UserControllerVerifyInvitationPathParams,
   UserControllerVerifyInvitation400,
} from '../models/UserControllerVerifyInvitation';

function getUserControllerVerifyInvitationUrl(
   token: UserControllerVerifyInvitationPathParams['token'],
) {
   const res = { method: 'HEAD', url: `/users/invitations/${token}` as const };
   return res;
}

export async function userControllerVerifyInvitation(
   token: UserControllerVerifyInvitationPathParams['token'],
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      UserControllerVerifyInvitationMutationResponse,
      ResponseErrorConfig<UserControllerVerifyInvitation400>,
      unknown
   >({
      method: 'HEAD',
      url: getUserControllerVerifyInvitationUrl(token).url.toString(),
      ...requestConfig,
   });
   return res;
}
