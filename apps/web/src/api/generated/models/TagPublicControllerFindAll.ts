/* eslint-disable */

import type { PublicTagEntity } from './PublicTagEntity';

export const tagPublicControllerFindAllQueryParamsSortOrderEnum = {
   asc: 'asc',
   desc: 'desc',
} as const;

export type TagPublicControllerFindAllQueryParamsSortOrderEnumKey =
   (typeof tagPublicControllerFindAllQueryParamsSortOrderEnum)[keyof typeof tagPublicControllerFindAllQueryParamsSortOrderEnum];

export type TagPublicControllerFindAllQueryParams = {
   page?: number;
   limit?: number;
   sortBy?: string;
   sortOrder?: TagPublicControllerFindAllQueryParamsSortOrderEnumKey;
   search?: string;
};

export type TagPublicControllerFindAll200 = {
   data: PublicTagEntity[];
   totalCount: number;
};

export type TagPublicControllerFindAllQueryResponse = TagPublicControllerFindAll200;

export type TagPublicControllerFindAllQuery = {
   Response: TagPublicControllerFindAll200;
   QueryParams: TagPublicControllerFindAllQueryParams;
   Errors: any;
};
