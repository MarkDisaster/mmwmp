/* eslint-disable */

import type { AdminUpdateUserDto } from './AdminUpdateUserDto';
import type { UserEntity } from './UserEntity';

export type UserControllerAdminUpdatePathParams = {
   id: number;
};

export type UserControllerAdminUpdate200 = UserEntity;

export type UserControllerAdminUpdate400 = any;

export type UserControllerAdminUpdate403 = any;

export type UserControllerAdminUpdate409 = any;

export type UserControllerAdminUpdateMutationRequest = AdminUpdateUserDto;

export type UserControllerAdminUpdateMutationResponse = UserControllerAdminUpdate200;

export type UserControllerAdminUpdateMutation = {
   Response: UserControllerAdminUpdate200;
   Request: UserControllerAdminUpdateMutationRequest;
   PathParams: UserControllerAdminUpdatePathParams;
   Errors:
      | UserControllerAdminUpdate400
      | UserControllerAdminUpdate403
      | UserControllerAdminUpdate409;
};
