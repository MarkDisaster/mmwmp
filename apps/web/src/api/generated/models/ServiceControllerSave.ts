/* eslint-disable */

import type { ErrorResponseDto } from './ErrorResponseDto';
import type { SaveServiceDto } from './SaveServiceDto';
import type { ServiceEntity } from './ServiceEntity';

export type ServiceControllerSavePathParams = {
   id: number;
};

export type ServiceControllerSave200 = ServiceEntity;

export type ServiceControllerSave400 = ErrorResponseDto;

export type ServiceControllerSave401 = ErrorResponseDto;

export type ServiceControllerSave403 = ErrorResponseDto;

export type ServiceControllerSave404 = ErrorResponseDto;

export type ServiceControllerSave409 = ErrorResponseDto;

export type ServiceControllerSaveMutationRequest = SaveServiceDto;

export type ServiceControllerSaveMutationResponse = ServiceControllerSave200;

export type ServiceControllerSaveMutation = {
   Response: ServiceControllerSave200;
   Request: ServiceControllerSaveMutationRequest;
   PathParams: ServiceControllerSavePathParams;
   Errors:
      | ServiceControllerSave400
      | ServiceControllerSave401
      | ServiceControllerSave403
      | ServiceControllerSave404
      | ServiceControllerSave409;
};
