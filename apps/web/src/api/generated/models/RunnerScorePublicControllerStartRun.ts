/* eslint-disable */

import type { RunnerRateLimitedEntity } from './RunnerRateLimitedEntity';
import type { RunnerRunEntity } from './RunnerRunEntity';

export type RunnerScorePublicControllerStartRun201 = RunnerRunEntity;

export type RunnerScorePublicControllerStartRun429 = RunnerRateLimitedEntity;

export type RunnerScorePublicControllerStartRunMutationResponse =
   RunnerScorePublicControllerStartRun201;

export type RunnerScorePublicControllerStartRunMutation = {
   Response: RunnerScorePublicControllerStartRun201;
   Errors: RunnerScorePublicControllerStartRun429;
};
