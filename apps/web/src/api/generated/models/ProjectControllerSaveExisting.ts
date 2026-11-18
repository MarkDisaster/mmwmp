/* eslint-disable */

import type { ErrorResponseDto } from './ErrorResponseDto';
import type { ProjectEntity } from './ProjectEntity';
import type { SaveProjectDto } from './SaveProjectDto';

export type ProjectControllerSaveExistingPathParams = {
   id: number;
};

export type ProjectControllerSaveExisting200 = ProjectEntity;

export type ProjectControllerSaveExisting400 = ErrorResponseDto;

export type ProjectControllerSaveExisting401 = ErrorResponseDto;

export type ProjectControllerSaveExisting403 = ErrorResponseDto;

export type ProjectControllerSaveExisting404 = ErrorResponseDto;

export type ProjectControllerSaveExisting409 = ErrorResponseDto;

export type ProjectControllerSaveExistingMutationRequest = SaveProjectDto;

export type ProjectControllerSaveExistingMutationResponse = ProjectControllerSaveExisting200;

export type ProjectControllerSaveExistingMutation = {
   Response: ProjectControllerSaveExisting200;
   Request: ProjectControllerSaveExistingMutationRequest;
   PathParams: ProjectControllerSaveExistingPathParams;
   Errors:
      | ProjectControllerSaveExisting400
      | ProjectControllerSaveExisting401
      | ProjectControllerSaveExisting403
      | ProjectControllerSaveExisting404
      | ProjectControllerSaveExisting409;
};
