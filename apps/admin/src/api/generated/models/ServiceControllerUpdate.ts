/* eslint-disable */

import type { ErrorResponseDto } from './ErrorResponseDto';
import type { ServiceEntity } from './ServiceEntity';
import type { UpdateServiceDto } from './UpdateServiceDto';

export type ServiceControllerUpdatePathParams = {
   id: number;
};

export type ServiceControllerUpdate200 = ServiceEntity;

export type ServiceControllerUpdate404 = any;

export type ServiceControllerUpdate409 = ErrorResponseDto;

export type ServiceControllerUpdateMutationRequest = UpdateServiceDto;

export type ServiceControllerUpdateMutationResponse = ServiceControllerUpdate200;

export type ServiceControllerUpdateMutation = {
   Response: ServiceControllerUpdate200;
   Request: ServiceControllerUpdateMutationRequest;
   PathParams: ServiceControllerUpdatePathParams;
   Errors: ServiceControllerUpdate404 | ServiceControllerUpdate409;
};
