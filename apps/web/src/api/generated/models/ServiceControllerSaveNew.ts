/* eslint-disable */

import type { ErrorResponseDto } from './ErrorResponseDto';
import type { SaveServiceDto } from './SaveServiceDto';
import type { ServiceEntity } from './ServiceEntity';

export type ServiceControllerSaveNew201 = ServiceEntity;

export type ServiceControllerSaveNew400 = ErrorResponseDto;

export type ServiceControllerSaveNew401 = ErrorResponseDto;

export type ServiceControllerSaveNew403 = ErrorResponseDto;

export type ServiceControllerSaveNew404 = ErrorResponseDto;

export type ServiceControllerSaveNew409 = ErrorResponseDto;

export type ServiceControllerSaveNewMutationRequest = SaveServiceDto;

export type ServiceControllerSaveNewMutationResponse = ServiceControllerSaveNew201;

export type ServiceControllerSaveNewMutation = {
   Response: ServiceControllerSaveNew201;
   Request: ServiceControllerSaveNewMutationRequest;
   Errors:
      | ServiceControllerSaveNew400
      | ServiceControllerSaveNew401
      | ServiceControllerSaveNew403
      | ServiceControllerSaveNew404
      | ServiceControllerSaveNew409;
};
