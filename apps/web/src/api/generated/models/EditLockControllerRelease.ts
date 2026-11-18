/* eslint-disable */

import type { EditLockEntity } from './EditLockEntity';
import type { ErrorResponseDto } from './ErrorResponseDto';
import type { ReleaseEditLockDto } from './ReleaseEditLockDto';

export type EditLockControllerReleasePathParams = {
   entity: EditLockEntity;
   id: number;
};

export type EditLockControllerRelease204 = any;

export type EditLockControllerRelease403 = ErrorResponseDto;

export type EditLockControllerRelease503 = ErrorResponseDto;

export type EditLockControllerReleaseMutationRequest = ReleaseEditLockDto;

export type EditLockControllerReleaseMutationResponse = EditLockControllerRelease204;

export type EditLockControllerReleaseMutation = {
   Response: EditLockControllerRelease204;
   Request: EditLockControllerReleaseMutationRequest;
   PathParams: EditLockControllerReleasePathParams;
   Errors: EditLockControllerRelease403 | EditLockControllerRelease503;
};
