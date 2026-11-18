import { apiErrorCodeEnum } from '@/api/generated';
import { getApiErrorCode, getHttpStatus, isVersionConflict } from '@/utils/httpError';

export type SaveFailure =
   | 'slugTaken'
   | 'versionConflict'
   | 'conflict'
   | 'invalid'
   | 'forbidden'
   | 'missing'
   | 'failed';

const FAILURE_BY_STATUS: Partial<Record<number, SaveFailure>> = {
   400: 'invalid',
   403: 'forbidden',
   404: 'missing',
};

export const getSaveFailure = (error: unknown): SaveFailure => {
   const status = getHttpStatus(error);
   if (status === 409) {
      if (getApiErrorCode(error) === apiErrorCodeEnum.SLUG_TAKEN) return 'slugTaken';
      return isVersionConflict(error) ? 'versionConflict' : 'conflict';
   }
   return FAILURE_BY_STATUS[status ?? 0] ?? 'failed';
};
