/* eslint-disable */

export type UserControllerVerifyInvitationPathParams = {
   token: string;
};

export type UserControllerVerifyInvitation200 = any;

export type UserControllerVerifyInvitation400 = any;

export type UserControllerVerifyInvitationMutationResponse = UserControllerVerifyInvitation200;

export type UserControllerVerifyInvitationMutation = {
   Response: UserControllerVerifyInvitation200;
   PathParams: UserControllerVerifyInvitationPathParams;
   Errors: UserControllerVerifyInvitation400;
};
