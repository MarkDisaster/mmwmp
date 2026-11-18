/* eslint-disable */

import type { ErrorResponseDto } from './ErrorResponseDto';
import type { RunnerScoreEntity } from './RunnerScoreEntity';
import type { UpdateRunnerScoreVisibilityDto } from './UpdateRunnerScoreVisibilityDto';

export type RunnerScoreControllerUpdateVisibilityPathParams = {
   id: number;
};

export type RunnerScoreControllerUpdateVisibility200 = RunnerScoreEntity;

export type RunnerScoreControllerUpdateVisibility404 = ErrorResponseDto;

export type RunnerScoreControllerUpdateVisibilityMutationRequest = UpdateRunnerScoreVisibilityDto;

export type RunnerScoreControllerUpdateVisibilityMutationResponse =
   RunnerScoreControllerUpdateVisibility200;

export type RunnerScoreControllerUpdateVisibilityMutation = {
   Response: RunnerScoreControllerUpdateVisibility200;
   Request: RunnerScoreControllerUpdateVisibilityMutationRequest;
   PathParams: RunnerScoreControllerUpdateVisibilityPathParams;
   Errors: RunnerScoreControllerUpdateVisibility404;
};
