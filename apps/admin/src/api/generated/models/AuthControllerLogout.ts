/* eslint-disable */

import type { RefreshTokenDto } from './RefreshTokenDto';

export type AuthControllerLogout201 = any;

export type AuthControllerLogoutMutationRequest = RefreshTokenDto;

export type AuthControllerLogoutMutationResponse = AuthControllerLogout201;

export type AuthControllerLogoutMutation = {
   Response: AuthControllerLogout201;
   Request: AuthControllerLogoutMutationRequest;
   Errors: any;
};
