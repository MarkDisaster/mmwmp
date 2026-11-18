/* eslint-disable */

import type { ErrorResponseDto } from './ErrorResponseDto';
import type { FileEntity } from './FileEntity';
import type { UpdateFileDto } from './UpdateFileDto';

export type FileControllerUpdatePathParams = {
   id: number;
};

export type FileControllerUpdate200 = FileEntity;

export type FileControllerUpdate403 = ErrorResponseDto;

export type FileControllerUpdate404 = ErrorResponseDto;

export type FileControllerUpdate409 = ErrorResponseDto;

export type FileControllerUpdateMutationRequest = UpdateFileDto;

export type FileControllerUpdateMutationResponse = FileControllerUpdate200;

export type FileControllerUpdateMutation = {
   Response: FileControllerUpdate200;
   Request: FileControllerUpdateMutationRequest;
   PathParams: FileControllerUpdatePathParams;
   Errors: FileControllerUpdate403 | FileControllerUpdate404 | FileControllerUpdate409;
};
