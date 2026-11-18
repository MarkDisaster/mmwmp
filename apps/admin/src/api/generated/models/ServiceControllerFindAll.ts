/* eslint-disable */

import type { ServiceEntity } from './ServiceEntity';

export const serviceControllerFindAllQueryParamsSortOrderEnum = {
   asc: 'asc',
   desc: 'desc',
} as const;

export type ServiceControllerFindAllQueryParamsSortOrderEnumKey =
   (typeof serviceControllerFindAllQueryParamsSortOrderEnum)[keyof typeof serviceControllerFindAllQueryParamsSortOrderEnum];

export const serviceControllerFindAllQueryParamsStatusEnum = {
   draft: 'draft',
   published: 'published',
} as const;

export type ServiceControllerFindAllQueryParamsStatusEnumKey =
   (typeof serviceControllerFindAllQueryParamsStatusEnum)[keyof typeof serviceControllerFindAllQueryParamsStatusEnum];

export type ServiceControllerFindAllQueryParams = {
   page?: number;
   limit?: number;
   sortBy?: string;
   sortOrder?: ServiceControllerFindAllQueryParamsSortOrderEnumKey;
   search?: string;
   status?: ServiceControllerFindAllQueryParamsStatusEnumKey;
};

export type ServiceControllerFindAll200 = {
   data: ServiceEntity[];
   totalCount: number;
};

export type ServiceControllerFindAllQueryResponse = ServiceControllerFindAll200;

export type ServiceControllerFindAllQuery = {
   Response: ServiceControllerFindAll200;
   QueryParams: ServiceControllerFindAllQueryParams;
   Errors: any;
};
