/* eslint-disable */

import type { FileEntity } from './FileEntity';

export const fileControllerFindAllQueryParamsSortOrderEnum = {
   asc: 'asc',
   desc: 'desc',
} as const;

export type FileControllerFindAllQueryParamsSortOrderEnumKey =
   (typeof fileControllerFindAllQueryParamsSortOrderEnum)[keyof typeof fileControllerFindAllQueryParamsSortOrderEnum];

export type FileControllerFindAllQueryParams = {
   page?: number;
   limit?: number;
   sortBy?: string;
   sortOrder?: FileControllerFindAllQueryParamsSortOrderEnumKey;
   search?: string;
   mimeTypePrefix?: string;
};

export type FileControllerFindAll200 = {
   data: FileEntity[];
   totalCount: number;
};

export type FileControllerFindAll400 = any;

export type FileControllerFindAllQueryResponse = FileControllerFindAll200;

export type FileControllerFindAllQuery = {
   Response: FileControllerFindAll200;
   QueryParams: FileControllerFindAllQueryParams;
   Errors: FileControllerFindAll400;
};
