/* eslint-disable */

import type { AuthResponseEntity } from './AuthResponseEntity';
import type { RefreshTokenDto } from './RefreshTokenDto';

export type AuthControllerRefresh201 = AuthResponseEntity;

export type AuthControllerRefresh401 = any;

export type AuthControllerRefreshMutationRequest = RefreshTokenDto;

export type AuthControllerRefreshMutationResponse = AuthControllerRefresh201;

export type AuthControllerRefreshMutation = {
   Response: AuthControllerRefresh201;
   Request: AuthControllerRefreshMutationRequest;
   Errors: AuthControllerRefresh401;
};
