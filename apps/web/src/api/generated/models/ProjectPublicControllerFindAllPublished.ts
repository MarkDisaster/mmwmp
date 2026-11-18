/* eslint-disable */

import type { PublicProjectEntity } from './PublicProjectEntity';

export const projectPublicControllerFindAllPublishedQueryParamsSortOrderEnum = {
   asc: 'asc',
   desc: 'desc',
} as const;

export type ProjectPublicControllerFindAllPublishedQueryParamsSortOrderEnumKey =
   (typeof projectPublicControllerFindAllPublishedQueryParamsSortOrderEnum)[keyof typeof projectPublicControllerFindAllPublishedQueryParamsSortOrderEnum];

export type ProjectPublicControllerFindAllPublishedQueryParams = {
   page?: number;
   limit?: number;
   sortBy?: string;
   sortOrder?: ProjectPublicControllerFindAllPublishedQueryParamsSortOrderEnumKey;
   search?: string;
   homepageOnly?: boolean;
};

export type ProjectPublicControllerFindAllPublishedHeaderParams = {
   'Accept-Language'?: string;
};

export type ProjectPublicControllerFindAllPublished200 = {
   data: PublicProjectEntity[];
   totalCount: number;
};

export type ProjectPublicControllerFindAllPublishedQueryResponse =
   ProjectPublicControllerFindAllPublished200;

export type ProjectPublicControllerFindAllPublishedQuery = {
   Response: ProjectPublicControllerFindAllPublished200;
   QueryParams: ProjectPublicControllerFindAllPublishedQueryParams;
   HeaderParams: ProjectPublicControllerFindAllPublishedHeaderParams;
   Errors: any;
};
