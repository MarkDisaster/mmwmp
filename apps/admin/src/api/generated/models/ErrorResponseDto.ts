/* eslint-disable */

import type { ApiErrorCode } from './ApiErrorCode';

export type ErrorResponseDto = {
   statusCode: number;
   message: string | string[];
   error?: string;
   code?: ApiErrorCode;
   currentVersion?: number;
};
