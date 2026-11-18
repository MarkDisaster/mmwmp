/* eslint-disable */

import type { RoleEntity } from './RoleEntity';
import type { UpdateRoleDto } from './UpdateRoleDto';

export type RoleControllerUpdatePathParams = {
   id: number;
};

export type RoleControllerUpdate200 = RoleEntity;

export type RoleControllerUpdateMutationRequest = UpdateRoleDto;

export type RoleControllerUpdateMutationResponse = RoleControllerUpdate200;

export type RoleControllerUpdateMutation = {
   Response: RoleControllerUpdate200;
   Request: RoleControllerUpdateMutationRequest;
   PathParams: RoleControllerUpdatePathParams;
   Errors: any;
};
