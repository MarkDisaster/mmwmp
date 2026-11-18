/* eslint-disable */

import type { ErrorResponseDto } from './ErrorResponseDto';
import type { FileEntity } from './FileEntity';

export type FileControllerRestorePathParams = {
   id: number;
};

export type FileControllerRestore200 = FileEntity;

export type FileControllerRestore403 = ErrorResponseDto;

export type FileControllerRestore404 = any;

export type FileControllerRestore409 = any;

export type FileControllerRestoreMutationResponse = FileControllerRestore200;

export type FileControllerRestoreMutation = {
   Response: FileControllerRestore200;
   PathParams: FileControllerRestorePathParams;
   Errors: FileControllerRestore403 | FileControllerRestore404 | FileControllerRestore409;
};
