/* eslint-disable */

import type { ErrorResponseDto } from './ErrorResponseDto';
import type { FileEntity } from './FileEntity';
import type { UploadFileBodyDto } from './UploadFileBodyDto';

export type FileControllerUpload201 = FileEntity;

export type FileControllerUpload400 = ErrorResponseDto;

export type FileControllerUpload413 = any;

export type FileControllerUploadMutationRequest = UploadFileBodyDto;

export type FileControllerUploadMutationResponse = FileControllerUpload201;

export type FileControllerUploadMutation = {
   Response: FileControllerUpload201;
   Request: FileControllerUploadMutationRequest;
   Errors: FileControllerUpload400 | FileControllerUpload413;
};
