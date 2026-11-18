/* eslint-disable */

import type { ApiErrorCode } from './ApiErrorCode';

export type RunnerRateLimitedEntity = {
   statusCode: number;
   message: string | string[];
   error?: string;
   code?: ApiErrorCode;
   currentVersion?: number;
   retryAfterSeconds?: number;
};
