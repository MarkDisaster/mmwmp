/* eslint-disable */

import type { ProjectEntity } from './ProjectEntity';

export const projectControllerFindAllQueryParamsSortOrderEnum = {
   asc: 'asc',
   desc: 'desc',
} as const;

export type ProjectControllerFindAllQueryParamsSortOrderEnumKey =
   (typeof projectControllerFindAllQueryParamsSortOrderEnum)[keyof typeof projectControllerFindAllQueryParamsSortOrderEnum];

export const projectControllerFindAllQueryParamsStatusEnum = {
   draft: 'draft',
   published: 'published',
} as const;

export type ProjectControllerFindAllQueryParamsStatusEnumKey =
   (typeof projectControllerFindAllQueryParamsStatusEnum)[keyof typeof projectControllerFindAllQueryParamsStatusEnum];

export type ProjectControllerFindAllQueryParams = {
   page?: number;
   limit?: number;
   sortBy?: string;
   sortOrder?: ProjectControllerFindAllQueryParamsSortOrderEnumKey;
   search?: string;
   status?: ProjectControllerFindAllQueryParamsStatusEnumKey;
};

export type ProjectControllerFindAll200 = {
   data: ProjectEntity[];
   totalCount: number;
};

export type ProjectControllerFindAllQueryResponse = ProjectControllerFindAll200;

export type ProjectControllerFindAllQuery = {
   Response: ProjectControllerFindAll200;
   QueryParams: ProjectControllerFindAllQueryParams;
   Errors: any;
};
