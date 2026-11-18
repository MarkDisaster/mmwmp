/* eslint-disable */

import type { UserEntity } from './UserEntity';

export type UserControllerReactivatePathParams = {
   id: number;
};

export type UserControllerReactivate200 = UserEntity;

export type UserControllerReactivate403 = any;

export type UserControllerReactivate404 = any;

export type UserControllerReactivate409 = any;

export type UserControllerReactivateMutationResponse = UserControllerReactivate200;

export type UserControllerReactivateMutation = {
   Response: UserControllerReactivate200;
   PathParams: UserControllerReactivatePathParams;
   Errors: UserControllerReactivate403 | UserControllerReactivate404 | UserControllerReactivate409;
};
