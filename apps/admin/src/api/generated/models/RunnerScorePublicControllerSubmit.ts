/* eslint-disable */

import type { CreateRunnerScoreDto } from './CreateRunnerScoreDto';
import type { ErrorResponseDto } from './ErrorResponseDto';
import type { RunnerRateLimitedEntity } from './RunnerRateLimitedEntity';
import type { RunnerScoreEntity } from './RunnerScoreEntity';
import type { RunnerScoreNotKeptEntity } from './RunnerScoreNotKeptEntity';

export type RunnerScorePublicControllerSubmit200 = RunnerScoreNotKeptEntity;

export type RunnerScorePublicControllerSubmit201 = RunnerScoreEntity;

export type RunnerScorePublicControllerSubmit400 = ErrorResponseDto;

export type RunnerScorePublicControllerSubmit429 = RunnerRateLimitedEntity;

export type RunnerScorePublicControllerSubmitMutationRequest = CreateRunnerScoreDto;

export type RunnerScorePublicControllerSubmitMutationResponse =
   | RunnerScorePublicControllerSubmit200
   | RunnerScorePublicControllerSubmit201;

export type RunnerScorePublicControllerSubmitMutation = {
   Response: RunnerScorePublicControllerSubmit200 | RunnerScorePublicControllerSubmit201;
   Request: RunnerScorePublicControllerSubmitMutationRequest;
   Errors: RunnerScorePublicControllerSubmit400 | RunnerScorePublicControllerSubmit429;
};
