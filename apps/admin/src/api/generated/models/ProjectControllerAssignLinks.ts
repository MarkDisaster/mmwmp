/* eslint-disable */

import type { AssignProjectLinksDto } from './AssignProjectLinksDto';
import type { ErrorResponseDto } from './ErrorResponseDto';
import type { ProjectEntity } from './ProjectEntity';

export type ProjectControllerAssignLinksPathParams = {
   id: number;
};

export type ProjectControllerAssignLinks200 = ProjectEntity;

export type ProjectControllerAssignLinks404 = any;

export type ProjectControllerAssignLinks409 = ErrorResponseDto;

export type ProjectControllerAssignLinksMutationRequest = AssignProjectLinksDto;

export type ProjectControllerAssignLinksMutationResponse = ProjectControllerAssignLinks200;

export type ProjectControllerAssignLinksMutation = {
   Response: ProjectControllerAssignLinks200;
   Request: ProjectControllerAssignLinksMutationRequest;
   PathParams: ProjectControllerAssignLinksPathParams;
   Errors: ProjectControllerAssignLinks404 | ProjectControllerAssignLinks409;
};
