/* eslint-disable */

import type { CreateRoleDto } from './CreateRoleDto';
import type { RoleEntity } from './RoleEntity';

export type RoleControllerCreate201 = RoleEntity;

export type RoleControllerCreateMutationRequest = CreateRoleDto;

export type RoleControllerCreateMutationResponse = RoleControllerCreate201;

export type RoleControllerCreateMutation = {
   Response: RoleControllerCreate201;
   Request: RoleControllerCreateMutationRequest;
   Errors: any;
};
