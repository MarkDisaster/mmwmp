/* eslint-disable */

import type { RunnerScoreEntity } from './RunnerScoreEntity';

export const runnerScoreControllerFindAllQueryParamsSortOrderEnum = {
   asc: 'asc',
   desc: 'desc',
} as const;

export type RunnerScoreControllerFindAllQueryParamsSortOrderEnumKey =
   (typeof runnerScoreControllerFindAllQueryParamsSortOrderEnum)[keyof typeof runnerScoreControllerFindAllQueryParamsSortOrderEnum];

export type RunnerScoreControllerFindAllQueryParams = {
   page?: number;
   limit?: number;
   sortBy?: string;
   sortOrder?: RunnerScoreControllerFindAllQueryParamsSortOrderEnumKey;
   search?: string;
};

export type RunnerScoreControllerFindAll200 = {
   data: RunnerScoreEntity[];
   totalCount: number;
};

export type RunnerScoreControllerFindAllQueryResponse = RunnerScoreControllerFindAll200;

export type RunnerScoreControllerFindAllQuery = {
   Response: RunnerScoreControllerFindAll200;
   QueryParams: RunnerScoreControllerFindAllQueryParams;
   Errors: any;
};
