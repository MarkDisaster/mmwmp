/* eslint-disable */

import type { TagEntity } from './TagEntity';

export const tagControllerFindAllQueryParamsSortOrderEnum = {
   asc: 'asc',
   desc: 'desc',
} as const;

export type TagControllerFindAllQueryParamsSortOrderEnumKey =
   (typeof tagControllerFindAllQueryParamsSortOrderEnum)[keyof typeof tagControllerFindAllQueryParamsSortOrderEnum];

export type TagControllerFindAllQueryParams = {
   page?: number;
   limit?: number;
   sortBy?: string;
   sortOrder?: TagControllerFindAllQueryParamsSortOrderEnumKey;
   search?: string;
};

export type TagControllerFindAll200 = {
   data: TagEntity[];
   totalCount: number;
};

export type TagControllerFindAllQueryResponse = TagControllerFindAll200;

export type TagControllerFindAllQuery = {
   Response: TagControllerFindAll200;
   QueryParams: TagControllerFindAllQueryParams;
   Errors: any;
};
