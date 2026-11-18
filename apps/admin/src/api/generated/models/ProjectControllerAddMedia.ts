/* eslint-disable */

import type { AddProjectMediaDto } from './AddProjectMediaDto';
import type { ErrorResponseDto } from './ErrorResponseDto';
import type { ProjectEntity } from './ProjectEntity';

export type ProjectControllerAddMediaPathParams = {
   id: number;
};

export type ProjectControllerAddMedia201 = ProjectEntity;

export type ProjectControllerAddMedia404 = any;

export type ProjectControllerAddMedia409 = ErrorResponseDto;

export type ProjectControllerAddMediaMutationRequest = AddProjectMediaDto;

export type ProjectControllerAddMediaMutationResponse = ProjectControllerAddMedia201;

export type ProjectControllerAddMediaMutation = {
   Response: ProjectControllerAddMedia201;
   Request: ProjectControllerAddMediaMutationRequest;
   PathParams: ProjectControllerAddMediaPathParams;
   Errors: ProjectControllerAddMedia404 | ProjectControllerAddMedia409;
};
