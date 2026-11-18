/* eslint-disable */

import type { UpdateUserRoleDto } from './UpdateUserRoleDto';
import type { UserEntity } from './UserEntity';

export type UserControllerUpdateRolePathParams = {
   id: number;
};

export type UserControllerUpdateRole200 = UserEntity;

export type UserControllerUpdateRole400 = any;

export type UserControllerUpdateRole404 = any;

export type UserControllerUpdateRoleMutationRequest = UpdateUserRoleDto;

export type UserControllerUpdateRoleMutationResponse = UserControllerUpdateRole200;

export type UserControllerUpdateRoleMutation = {
   Response: UserControllerUpdateRole200;
   Request: UserControllerUpdateRoleMutationRequest;
   PathParams: UserControllerUpdateRolePathParams;
   Errors: UserControllerUpdateRole400 | UserControllerUpdateRole404;
};
