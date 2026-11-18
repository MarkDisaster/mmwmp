/* eslint-disable */

import type { TrashedItemEntity } from './TrashedItemEntity';

export const projectControllerFindTrashedQueryParamsSortOrderEnum = {
   asc: 'asc',
   desc: 'desc',
} as const;

export type ProjectControllerFindTrashedQueryParamsSortOrderEnumKey =
   (typeof projectControllerFindTrashedQueryParamsSortOrderEnum)[keyof typeof projectControllerFindTrashedQueryParamsSortOrderEnum];

export type ProjectControllerFindTrashedQueryParams = {
   page?: number;
   limit?: number;
   sortBy?: string;
   sortOrder?: ProjectControllerFindTrashedQueryParamsSortOrderEnumKey;
   search?: string;
};

export type ProjectControllerFindTrashed200 = {
   data: TrashedItemEntity[];
   totalCount: number;
};

export type ProjectControllerFindTrashedQueryResponse = ProjectControllerFindTrashed200;

export type ProjectControllerFindTrashedQuery = {
   Response: ProjectControllerFindTrashed200;
   QueryParams: ProjectControllerFindTrashedQueryParams;
   Errors: any;
};
