/* eslint-disable */

import type { AssignProjectsDto } from './AssignProjectsDto';
import type { ErrorResponseDto } from './ErrorResponseDto';
import type { ServiceEntity } from './ServiceEntity';

export type ServiceControllerAssignProjectsPathParams = {
   id: number;
};

export type ServiceControllerAssignProjects201 = ServiceEntity;

export type ServiceControllerAssignProjects404 = any;

export type ServiceControllerAssignProjects409 = ErrorResponseDto;

export type ServiceControllerAssignProjectsMutationRequest = AssignProjectsDto;

export type ServiceControllerAssignProjectsMutationResponse = ServiceControllerAssignProjects201;

export type ServiceControllerAssignProjectsMutation = {
   Response: ServiceControllerAssignProjects201;
   Request: ServiceControllerAssignProjectsMutationRequest;
   PathParams: ServiceControllerAssignProjectsPathParams;
   Errors: ServiceControllerAssignProjects404 | ServiceControllerAssignProjects409;
};
