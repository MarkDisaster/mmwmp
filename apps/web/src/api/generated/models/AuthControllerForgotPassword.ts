/* eslint-disable */

import type { ForgotPasswordDto } from './ForgotPasswordDto';

export type AuthControllerForgotPassword200 = any;

export type AuthControllerForgotPassword429 = any;

export type AuthControllerForgotPassword503 = any;

export type AuthControllerForgotPasswordMutationRequest = ForgotPasswordDto;

export type AuthControllerForgotPasswordMutationResponse = AuthControllerForgotPassword200;

export type AuthControllerForgotPasswordMutation = {
   Response: AuthControllerForgotPassword200;
   Request: AuthControllerForgotPasswordMutationRequest;
   Errors: AuthControllerForgotPassword429 | AuthControllerForgotPassword503;
};
