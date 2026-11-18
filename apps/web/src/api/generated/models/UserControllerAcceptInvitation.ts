/* eslint-disable */

import type { AcceptInvitationDto } from './AcceptInvitationDto';
import type { AuthResponseEntity } from './AuthResponseEntity';

export type UserControllerAcceptInvitationPathParams = {
   token: string;
};

export type UserControllerAcceptInvitation201 = AuthResponseEntity;

export type UserControllerAcceptInvitation400 = any;

export type UserControllerAcceptInvitationMutationRequest = AcceptInvitationDto;

export type UserControllerAcceptInvitationMutationResponse = UserControllerAcceptInvitation201;

export type UserControllerAcceptInvitationMutation = {
   Response: UserControllerAcceptInvitation201;
   Request: UserControllerAcceptInvitationMutationRequest;
   PathParams: UserControllerAcceptInvitationPathParams;
   Errors: UserControllerAcceptInvitation400;
};
