/* eslint-disable */

import type { ErrorResponseDto } from './ErrorResponseDto';

export type RunnerScoreControllerRemovePathParams = {
   id: number;
};

export type RunnerScoreControllerRemove204 = any;

export type RunnerScoreControllerRemove404 = ErrorResponseDto;

export type RunnerScoreControllerRemoveMutationResponse = RunnerScoreControllerRemove204;

export type RunnerScoreControllerRemoveMutation = {
   Response: RunnerScoreControllerRemove204;
   PathParams: RunnerScoreControllerRemovePathParams;
   Errors: RunnerScoreControllerRemove404;
};
