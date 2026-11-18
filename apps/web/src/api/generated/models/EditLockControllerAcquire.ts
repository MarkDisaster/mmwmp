/* eslint-disable */

import type { AcquireEditLockDto } from './AcquireEditLockDto';
import type { EditLockEntity } from './EditLockEntity';
import type { EditLockStateEntity } from './EditLockStateEntity';
import type { ErrorResponseDto } from './ErrorResponseDto';

export type EditLockControllerAcquirePathParams = {
   entity: EditLockEntity;
   id: number;
};

export type EditLockControllerAcquire200 = EditLockStateEntity;

export type EditLockControllerAcquire403 = ErrorResponseDto;

export type EditLockControllerAcquire503 = ErrorResponseDto;

export type EditLockControllerAcquireMutationRequest = AcquireEditLockDto;

export type EditLockControllerAcquireMutationResponse = EditLockControllerAcquire200;

export type EditLockControllerAcquireMutation = {
   Response: EditLockControllerAcquire200;
   Request: EditLockControllerAcquireMutationRequest;
   PathParams: EditLockControllerAcquirePathParams;
   Errors: EditLockControllerAcquire403 | EditLockControllerAcquire503;
};
