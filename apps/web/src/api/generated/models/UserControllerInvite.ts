/* eslint-disable */

import type { UserInvitationDto } from './UserInvitationDto';

export type UserControllerInvite201 = any;

export type UserControllerInvite409 = any;

export type UserControllerInviteMutationRequest = UserInvitationDto;

export type UserControllerInviteMutationResponse = UserControllerInvite201;

export type UserControllerInviteMutation = {
   Response: UserControllerInvite201;
   Request: UserControllerInviteMutationRequest;
   Errors: UserControllerInvite409;
};
