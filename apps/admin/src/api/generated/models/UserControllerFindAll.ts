/* eslint-disable */

import type { UserEntity } from './UserEntity';

export const userControllerFindAllQueryParamsSortOrderEnum = {
   asc: 'asc',
   desc: 'desc',
} as const;

export type UserControllerFindAllQueryParamsSortOrderEnumKey =
   (typeof userControllerFindAllQueryParamsSortOrderEnum)[keyof typeof userControllerFindAllQueryParamsSortOrderEnum];

export const userControllerFindAllQueryParamsStatusEnum = {
   all: 'all',
   active: 'active',
   deactivated: 'deactivated',
} as const;

export type UserControllerFindAllQueryParamsStatusEnumKey =
   (typeof userControllerFindAllQueryParamsStatusEnum)[keyof typeof userControllerFindAllQueryParamsStatusEnum];

export type UserControllerFindAllQueryParams = {
   page?: number;
   limit?: number;
   sortBy?: string;
   sortOrder?: UserControllerFindAllQueryParamsSortOrderEnumKey;
   search?: string;
   status?: UserControllerFindAllQueryParamsStatusEnumKey;
};

export type UserControllerFindAll200 = {
   data: UserEntity[];
   totalCount: number;
};

export type UserControllerFindAllQueryResponse = UserControllerFindAll200;

export type UserControllerFindAllQuery = {
   Response: UserControllerFindAll200;
   QueryParams: UserControllerFindAllQueryParams;
   Errors: any;
};
