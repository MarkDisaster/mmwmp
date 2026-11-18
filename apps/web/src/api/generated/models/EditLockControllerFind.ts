/* eslint-disable */

import type { EditLockEntity } from './EditLockEntity';
import type { EditLockStateEntity } from './EditLockStateEntity';
import type { ErrorResponseDto } from './ErrorResponseDto';

export type EditLockControllerFindPathParams = {
   entity: EditLockEntity;
   id: number;
};

export type EditLockControllerFindQueryParams = {
   sessionId?: string;
};

export type EditLockControllerFind200 = EditLockStateEntity;

export type EditLockControllerFind403 = ErrorResponseDto;

export type EditLockControllerFind503 = ErrorResponseDto;

export type EditLockControllerFindQueryResponse = EditLockControllerFind200;

export type EditLockControllerFindQuery = {
   Response: EditLockControllerFind200;
   PathParams: EditLockControllerFindPathParams;
   QueryParams: EditLockControllerFindQueryParams;
   Errors: EditLockControllerFind403 | EditLockControllerFind503;
};
