/* eslint-disable */

import type { TrashedItemEntity } from './TrashedItemEntity';

export const tagControllerFindTrashedQueryParamsSortOrderEnum = {
   asc: 'asc',
   desc: 'desc',
} as const;

export type TagControllerFindTrashedQueryParamsSortOrderEnumKey =
   (typeof tagControllerFindTrashedQueryParamsSortOrderEnum)[keyof typeof tagControllerFindTrashedQueryParamsSortOrderEnum];

export type TagControllerFindTrashedQueryParams = {
   page?: number;
   limit?: number;
   sortBy?: string;
   sortOrder?: TagControllerFindTrashedQueryParamsSortOrderEnumKey;
   search?: string;
};

export type TagControllerFindTrashed200 = {
   data: TrashedItemEntity[];
   totalCount: number;
};

export type TagControllerFindTrashedQueryResponse = TagControllerFindTrashed200;

export type TagControllerFindTrashedQuery = {
   Response: TagControllerFindTrashed200;
   QueryParams: TagControllerFindTrashedQueryParams;
   Errors: any;
};
