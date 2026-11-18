/* eslint-disable */

import type { UserEntity } from './UserEntity';

export type UserControllerDeactivatePathParams = {
   id: number;
};

export type UserControllerDeactivate200 = UserEntity;

export type UserControllerDeactivate400 = any;

export type UserControllerDeactivate403 = any;

export type UserControllerDeactivate404 = any;

export type UserControllerDeactivate409 = any;

export type UserControllerDeactivateMutationResponse = UserControllerDeactivate200;

export type UserControllerDeactivateMutation = {
   Response: UserControllerDeactivate200;
   PathParams: UserControllerDeactivatePathParams;
   Errors:
      | UserControllerDeactivate400
      | UserControllerDeactivate403
      | UserControllerDeactivate404
      | UserControllerDeactivate409;
};
