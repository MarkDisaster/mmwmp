/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   UserControllerResendInvitationMutationResponse,
   UserControllerResendInvitationPathParams,
   UserControllerResendInvitation404,
} from '../models/UserControllerResendInvitation';

function getUserControllerResendInvitationUrl(id: UserControllerResendInvitationPathParams['id']) {
   const res = { method: 'POST', url: `/users/${id}/resend-invitation` as const };
   return res;
}

export async function userControllerResendInvitation(
   id: UserControllerResendInvitationPathParams['id'],
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      UserControllerResendInvitationMutationResponse,
      ResponseErrorConfig<UserControllerResendInvitation404>,
      unknown
   >({
      method: 'POST',
      url: getUserControllerResendInvitationUrl(id).url.toString(),
      ...requestConfig,
   });
   return res;
}
