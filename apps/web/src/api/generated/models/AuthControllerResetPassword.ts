/* eslint-disable */

import type { ResetPasswordDto } from './ResetPasswordDto';

export type AuthControllerResetPassword200 = any;

export type AuthControllerResetPassword400 = any;

export type AuthControllerResetPasswordMutationRequest = ResetPasswordDto;

export type AuthControllerResetPasswordMutationResponse = AuthControllerResetPassword200;

export type AuthControllerResetPasswordMutation = {
   Response: AuthControllerResetPassword200;
   Request: AuthControllerResetPasswordMutationRequest;
   Errors: AuthControllerResetPassword400;
};
