/* eslint-disable */

export const apiErrorCodeEnum = {
   SLUG_TAKEN: 'SLUG_TAKEN',
   CONCURRENT_CHANGE: 'CONCURRENT_CHANGE',
   BUSY: 'BUSY',
   VERSION_CONFLICT: 'VERSION_CONFLICT',
} as const;

export type ApiErrorCodeEnumKey = (typeof apiErrorCodeEnum)[keyof typeof apiErrorCodeEnum];

export type ApiErrorCode = ApiErrorCodeEnumKey;
