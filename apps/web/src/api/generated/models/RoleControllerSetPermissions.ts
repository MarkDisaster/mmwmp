/* eslint-disable */

import type { RoleEntity } from './RoleEntity';
import type { SetPermissionsDto } from './SetPermissionsDto';

export type RoleControllerSetPermissionsPathParams = {
   id: number;
};

export type RoleControllerSetPermissions200 = RoleEntity;

export type RoleControllerSetPermissions400 = any;

export type RoleControllerSetPermissions403 = any;

export type RoleControllerSetPermissionsMutationRequest = SetPermissionsDto;

export type RoleControllerSetPermissionsMutationResponse = RoleControllerSetPermissions200;

export type RoleControllerSetPermissionsMutation = {
   Response: RoleControllerSetPermissions200;
   Request: RoleControllerSetPermissionsMutationRequest;
   PathParams: RoleControllerSetPermissionsPathParams;
   Errors: RoleControllerSetPermissions400 | RoleControllerSetPermissions403;
};
