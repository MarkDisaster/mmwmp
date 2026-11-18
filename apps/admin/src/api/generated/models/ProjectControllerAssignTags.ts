/* eslint-disable */

import type { AssignTagsDto } from './AssignTagsDto';
import type { ErrorResponseDto } from './ErrorResponseDto';
import type { ProjectEntity } from './ProjectEntity';

export type ProjectControllerAssignTagsPathParams = {
   id: number;
};

export type ProjectControllerAssignTags201 = ProjectEntity;

export type ProjectControllerAssignTags404 = any;

export type ProjectControllerAssignTags409 = ErrorResponseDto;

export type ProjectControllerAssignTagsMutationRequest = AssignTagsDto;

export type ProjectControllerAssignTagsMutationResponse = ProjectControllerAssignTags201;

export type ProjectControllerAssignTagsMutation = {
   Response: ProjectControllerAssignTags201;
   Request: ProjectControllerAssignTagsMutationRequest;
   PathParams: ProjectControllerAssignTagsPathParams;
   Errors: ProjectControllerAssignTags404 | ProjectControllerAssignTags409;
};
