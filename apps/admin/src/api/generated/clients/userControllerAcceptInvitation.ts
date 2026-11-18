/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   UserControllerAcceptInvitationMutationRequest,
   UserControllerAcceptInvitationMutationResponse,
   UserControllerAcceptInvitationPathParams,
   UserControllerAcceptInvitation400,
} from '../models/UserControllerAcceptInvitation';

function getUserControllerAcceptInvitationUrl(
   token: UserControllerAcceptInvitationPathParams['token'],
) {
   const res = { method: 'POST', url: `/users/invitations/${token}/accept` as const };
   return res;
}

export async function userControllerAcceptInvitation(
   token: UserControllerAcceptInvitationPathParams['token'],
   data: UserControllerAcceptInvitationMutationRequest,
   config: Partial<RequestConfig<UserControllerAcceptInvitationMutationRequest>> & {
      client?: Client;
   } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      UserControllerAcceptInvitationMutationResponse,
      ResponseErrorConfig<UserControllerAcceptInvitation400>,
      UserControllerAcceptInvitationMutationRequest
   >({
      method: 'POST',
      url: getUserControllerAcceptInvitationUrl(token).url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
