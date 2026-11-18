/* eslint-disable */

import type { TrashedItemEntity } from './TrashedItemEntity';

export const fileControllerFindTrashedQueryParamsSortOrderEnum = {
   asc: 'asc',
   desc: 'desc',
} as const;

export type FileControllerFindTrashedQueryParamsSortOrderEnumKey =
   (typeof fileControllerFindTrashedQueryParamsSortOrderEnum)[keyof typeof fileControllerFindTrashedQueryParamsSortOrderEnum];

export type FileControllerFindTrashedQueryParams = {
   page?: number;
   limit?: number;
   sortBy?: string;
   sortOrder?: FileControllerFindTrashedQueryParamsSortOrderEnumKey;
   search?: string;
};

export type FileControllerFindTrashed200 = {
   data: TrashedItemEntity[];
   totalCount: number;
};

export type FileControllerFindTrashedQueryResponse = FileControllerFindTrashed200;

export type FileControllerFindTrashedQuery = {
   Response: FileControllerFindTrashed200;
   QueryParams: FileControllerFindTrashedQueryParams;
   Errors: any;
};
