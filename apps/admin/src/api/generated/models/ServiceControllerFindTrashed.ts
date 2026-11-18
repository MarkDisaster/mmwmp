/* eslint-disable */

import type { TrashedItemEntity } from './TrashedItemEntity';

export const serviceControllerFindTrashedQueryParamsSortOrderEnum = {
   asc: 'asc',
   desc: 'desc',
} as const;

export type ServiceControllerFindTrashedQueryParamsSortOrderEnumKey =
   (typeof serviceControllerFindTrashedQueryParamsSortOrderEnum)[keyof typeof serviceControllerFindTrashedQueryParamsSortOrderEnum];

export type ServiceControllerFindTrashedQueryParams = {
   page?: number;
   limit?: number;
   sortBy?: string;
   sortOrder?: ServiceControllerFindTrashedQueryParamsSortOrderEnumKey;
   search?: string;
};

export type ServiceControllerFindTrashed200 = {
   data: TrashedItemEntity[];
   totalCount: number;
};

export type ServiceControllerFindTrashedQueryResponse = ServiceControllerFindTrashed200;

export type ServiceControllerFindTrashedQuery = {
   Response: ServiceControllerFindTrashed200;
   QueryParams: ServiceControllerFindTrashedQueryParams;
   Errors: any;
};
