/* eslint-disable */

import type { CreateUserDto } from './CreateUserDto';
import type { UserEntity } from './UserEntity';

export type UserControllerCreate201 = UserEntity;

export type UserControllerCreate409 = any;

export type UserControllerCreateMutationRequest = CreateUserDto;

export type UserControllerCreateMutationResponse = UserControllerCreate201;

export type UserControllerCreateMutation = {
   Response: UserControllerCreate201;
   Request: UserControllerCreateMutationRequest;
   Errors: UserControllerCreate409;
};
