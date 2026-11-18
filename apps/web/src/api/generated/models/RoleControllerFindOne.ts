/* eslint-disable */

import type { RoleEntity } from './RoleEntity';

export type RoleControllerFindOnePathParams = {
   id: number;
};

export type RoleControllerFindOne200 = RoleEntity;

export type RoleControllerFindOneQueryResponse = RoleControllerFindOne200;

export type RoleControllerFindOneQuery = {
   Response: RoleControllerFindOne200;
   PathParams: RoleControllerFindOnePathParams;
   Errors: any;
};
