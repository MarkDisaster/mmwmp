/* eslint-disable */

import type { ErrorResponseDto } from './ErrorResponseDto';
import type { ProjectEntity } from './ProjectEntity';
import type { SaveProjectDto } from './SaveProjectDto';

export type ProjectControllerSaveNew201 = ProjectEntity;

export type ProjectControllerSaveNew400 = ErrorResponseDto;

export type ProjectControllerSaveNew401 = ErrorResponseDto;

export type ProjectControllerSaveNew403 = ErrorResponseDto;

export type ProjectControllerSaveNew404 = ErrorResponseDto;

export type ProjectControllerSaveNew409 = ErrorResponseDto;

export type ProjectControllerSaveNewMutationRequest = SaveProjectDto;

export type ProjectControllerSaveNewMutationResponse = ProjectControllerSaveNew201;

export type ProjectControllerSaveNewMutation = {
   Response: ProjectControllerSaveNew201;
   Request: ProjectControllerSaveNewMutationRequest;
   Errors:
      | ProjectControllerSaveNew400
      | ProjectControllerSaveNew401
      | ProjectControllerSaveNew403
      | ProjectControllerSaveNew404
      | ProjectControllerSaveNew409;
};
