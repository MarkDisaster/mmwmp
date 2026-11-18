/* eslint-disable */

import type { UserEntity } from './UserEntity';

export type UserControllerFindOnePathParams = {
   id: number;
};

export type UserControllerFindOne200 = UserEntity;

export type UserControllerFindOne404 = any;

export type UserControllerFindOneQueryResponse = UserControllerFindOne200;

export type UserControllerFindOneQuery = {
   Response: UserControllerFindOne200;
   PathParams: UserControllerFindOnePathParams;
   Errors: UserControllerFindOne404;
};
