/* eslint-disable */

import type { PublicServiceEntity } from './PublicServiceEntity';

export const servicePublicControllerFindAllPublishedQueryParamsSortOrderEnum = {
   asc: 'asc',
   desc: 'desc',
} as const;

export type ServicePublicControllerFindAllPublishedQueryParamsSortOrderEnumKey =
   (typeof servicePublicControllerFindAllPublishedQueryParamsSortOrderEnum)[keyof typeof servicePublicControllerFindAllPublishedQueryParamsSortOrderEnum];

export type ServicePublicControllerFindAllPublishedQueryParams = {
   page?: number;
   limit?: number;
   sortBy?: string;
   sortOrder?: ServicePublicControllerFindAllPublishedQueryParamsSortOrderEnumKey;
   search?: string;
   homepageOnly?: boolean;
};

export type ServicePublicControllerFindAllPublishedHeaderParams = {
   Authorization?: string;
   'Accept-Language'?: string;
};

export type ServicePublicControllerFindAllPublished200 = {
   data: PublicServiceEntity[];
   totalCount: number;
};

export type ServicePublicControllerFindAllPublishedQueryResponse =
   ServicePublicControllerFindAllPublished200;

export type ServicePublicControllerFindAllPublishedQuery = {
   Response: ServicePublicControllerFindAllPublished200;
   QueryParams: ServicePublicControllerFindAllPublishedQueryParams;
   HeaderParams: ServicePublicControllerFindAllPublishedHeaderParams;
   Errors: any;
};
