/* eslint-disable */

import type { ErrorResponseDto } from './ErrorResponseDto';
import type { ProjectEntity } from './ProjectEntity';
import type { UpdateProjectDto } from './UpdateProjectDto';

export type ProjectControllerUpdatePathParams = {
   id: number;
};

export type ProjectControllerUpdate200 = ProjectEntity;

export type ProjectControllerUpdate404 = any;

export type ProjectControllerUpdate409 = ErrorResponseDto;

export type ProjectControllerUpdateMutationRequest = UpdateProjectDto;

export type ProjectControllerUpdateMutationResponse = ProjectControllerUpdate200;

export type ProjectControllerUpdateMutation = {
   Response: ProjectControllerUpdate200;
   Request: ProjectControllerUpdateMutationRequest;
   PathParams: ProjectControllerUpdatePathParams;
   Errors: ProjectControllerUpdate404 | ProjectControllerUpdate409;
};
