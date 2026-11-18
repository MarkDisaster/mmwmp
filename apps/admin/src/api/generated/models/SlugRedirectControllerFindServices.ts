/* eslint-disable */

import type { AdminSlugRedirectEntity } from './AdminSlugRedirectEntity';

export const slugRedirectControllerFindServicesQueryParamsSortOrderEnum = {
   asc: 'asc',
   desc: 'desc',
} as const;

export type SlugRedirectControllerFindServicesQueryParamsSortOrderEnumKey =
   (typeof slugRedirectControllerFindServicesQueryParamsSortOrderEnum)[keyof typeof slugRedirectControllerFindServicesQueryParamsSortOrderEnum];

export type SlugRedirectControllerFindServicesQueryParams = {
   page?: number;
   limit?: number;
   sortBy?: string;
   sortOrder?: SlugRedirectControllerFindServicesQueryParamsSortOrderEnumKey;
   search?: string;
};

export type SlugRedirectControllerFindServices200 = {
   data: AdminSlugRedirectEntity[];
   totalCount: number;
};

export type SlugRedirectControllerFindServicesQueryResponse = SlugRedirectControllerFindServices200;

export type SlugRedirectControllerFindServicesQuery = {
   Response: SlugRedirectControllerFindServices200;
   QueryParams: SlugRedirectControllerFindServicesQueryParams;
   Errors: any;
};
