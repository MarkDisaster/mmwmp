/* eslint-disable */

import type { AuthLoginDto } from './AuthLoginDto';
import type { AuthResponseEntity } from './AuthResponseEntity';

export type AuthControllerSignIn201 = AuthResponseEntity;

export type AuthControllerSignIn401 = any;

export type AuthControllerSignIn429 = any;

export type AuthControllerSignIn503 = any;

export type AuthControllerSignInMutationRequest = AuthLoginDto;

export type AuthControllerSignInMutationResponse = AuthControllerSignIn201;

export type AuthControllerSignInMutation = {
   Response: AuthControllerSignIn201;
   Request: AuthControllerSignInMutationRequest;
   Errors: AuthControllerSignIn401 | AuthControllerSignIn429 | AuthControllerSignIn503;
};
