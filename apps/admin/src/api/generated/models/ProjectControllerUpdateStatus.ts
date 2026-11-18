/* eslint-disable */

import type { ErrorResponseDto } from './ErrorResponseDto';
import type { ProjectEntity } from './ProjectEntity';
import type { UpdateStatusDto } from './UpdateStatusDto';

export type ProjectControllerUpdateStatusPathParams = {
   id: number;
};

export type ProjectControllerUpdateStatus200 = ProjectEntity;

export type ProjectControllerUpdateStatus404 = any;

export type ProjectControllerUpdateStatus409 = ErrorResponseDto;

export type ProjectControllerUpdateStatusMutationRequest = UpdateStatusDto;

export type ProjectControllerUpdateStatusMutationResponse = ProjectControllerUpdateStatus200;

export type ProjectControllerUpdateStatusMutation = {
   Response: ProjectControllerUpdateStatus200;
   Request: ProjectControllerUpdateStatusMutationRequest;
   PathParams: ProjectControllerUpdateStatusPathParams;
   Errors: ProjectControllerUpdateStatus404 | ProjectControllerUpdateStatus409;
};
