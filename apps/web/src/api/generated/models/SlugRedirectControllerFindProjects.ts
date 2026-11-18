/* eslint-disable */

import type { AdminSlugRedirectEntity } from './AdminSlugRedirectEntity';

export const slugRedirectControllerFindProjectsQueryParamsSortOrderEnum = {
   asc: 'asc',
   desc: 'desc',
} as const;

export type SlugRedirectControllerFindProjectsQueryParamsSortOrderEnumKey =
   (typeof slugRedirectControllerFindProjectsQueryParamsSortOrderEnum)[keyof typeof slugRedirectControllerFindProjectsQueryParamsSortOrderEnum];

export type SlugRedirectControllerFindProjectsQueryParams = {
   page?: number;
   limit?: number;
   sortBy?: string;
   sortOrder?: SlugRedirectControllerFindProjectsQueryParamsSortOrderEnumKey;
   search?: string;
};

export type SlugRedirectControllerFindProjects200 = {
   data: AdminSlugRedirectEntity[];
   totalCount: number;
};

export type SlugRedirectControllerFindProjectsQueryResponse = SlugRedirectControllerFindProjects200;

export type SlugRedirectControllerFindProjectsQuery = {
   Response: SlugRedirectControllerFindProjects200;
   QueryParams: SlugRedirectControllerFindProjectsQueryParams;
   Errors: any;
};
