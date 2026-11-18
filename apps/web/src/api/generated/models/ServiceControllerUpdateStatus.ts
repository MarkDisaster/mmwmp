/* eslint-disable */

import type { ErrorResponseDto } from './ErrorResponseDto';
import type { ServiceEntity } from './ServiceEntity';
import type { UpdateStatusDto } from './UpdateStatusDto';

export type ServiceControllerUpdateStatusPathParams = {
   id: number;
};

export type ServiceControllerUpdateStatus200 = ServiceEntity;

export type ServiceControllerUpdateStatus404 = any;

export type ServiceControllerUpdateStatus409 = ErrorResponseDto;

export type ServiceControllerUpdateStatusMutationRequest = UpdateStatusDto;

export type ServiceControllerUpdateStatusMutationResponse = ServiceControllerUpdateStatus200;

export type ServiceControllerUpdateStatusMutation = {
   Response: ServiceControllerUpdateStatus200;
   Request: ServiceControllerUpdateStatusMutationRequest;
   PathParams: ServiceControllerUpdateStatusPathParams;
   Errors: ServiceControllerUpdateStatus404 | ServiceControllerUpdateStatus409;
};
