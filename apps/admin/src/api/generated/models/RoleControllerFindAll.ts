/* eslint-disable */

import type { RoleEntity } from './RoleEntity';

export const roleControllerFindAllQueryParamsSortOrderEnum = {
   asc: 'asc',
   desc: 'desc',
} as const;

export type RoleControllerFindAllQueryParamsSortOrderEnumKey =
   (typeof roleControllerFindAllQueryParamsSortOrderEnum)[keyof typeof roleControllerFindAllQueryParamsSortOrderEnum];

export type RoleControllerFindAllQueryParams = {
   page?: number;
   limit?: number;
   sortBy?: string;
   sortOrder?: RoleControllerFindAllQueryParamsSortOrderEnumKey;
   search?: string;
};

export type RoleControllerFindAll200 = {
   data: RoleEntity[];
   totalCount: number;
};

export type RoleControllerFindAllQueryResponse = RoleControllerFindAll200;

export type RoleControllerFindAllQuery = {
   Response: RoleControllerFindAll200;
   QueryParams: RoleControllerFindAllQueryParams;
   Errors: any;
};
