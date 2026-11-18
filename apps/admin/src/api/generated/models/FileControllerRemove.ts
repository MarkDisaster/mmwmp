/* eslint-disable */

import type { ErrorResponseDto } from './ErrorResponseDto';

export type FileControllerRemovePathParams = {
   id: number;
};

export type FileControllerRemove204 = any;

export type FileControllerRemove403 = ErrorResponseDto;

export type FileControllerRemove404 = any;

export type FileControllerRemoveMutationResponse = FileControllerRemove204;

export type FileControllerRemoveMutation = {
   Response: FileControllerRemove204;
   PathParams: FileControllerRemovePathParams;
   Errors: FileControllerRemove403 | FileControllerRemove404;
};
