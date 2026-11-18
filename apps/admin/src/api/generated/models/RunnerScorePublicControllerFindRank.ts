/* eslint-disable */

import type { ErrorResponseDto } from './ErrorResponseDto';
import type { RunnerRankEntity } from './RunnerRankEntity';

export type RunnerScorePublicControllerFindRankQueryParams = {
   score: number;
};

export type RunnerScorePublicControllerFindRank200 = RunnerRankEntity;

export type RunnerScorePublicControllerFindRank400 = ErrorResponseDto;

export type RunnerScorePublicControllerFindRankQueryResponse =
   RunnerScorePublicControllerFindRank200;

export type RunnerScorePublicControllerFindRankQuery = {
   Response: RunnerScorePublicControllerFindRank200;
   QueryParams: RunnerScorePublicControllerFindRankQueryParams;
   Errors: RunnerScorePublicControllerFindRank400;
};
