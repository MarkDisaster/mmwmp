/* eslint-disable */

import type { UpdateNameDto } from './UpdateNameDto';
import type { UserEntity } from './UserEntity';

export type UserControllerUpdateName200 = UserEntity;

export type UserControllerUpdateNameMutationRequest = UpdateNameDto;

export type UserControllerUpdateNameMutationResponse = UserControllerUpdateName200;

export type UserControllerUpdateNameMutation = {
   Response: UserControllerUpdateName200;
   Request: UserControllerUpdateNameMutationRequest;
   Errors: any;
};
