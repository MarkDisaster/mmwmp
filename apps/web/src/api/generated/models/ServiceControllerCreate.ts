/* eslint-disable */

import type { CreateServiceDto } from './CreateServiceDto';
import type { ServiceEntity } from './ServiceEntity';

export type ServiceControllerCreate201 = ServiceEntity;

export type ServiceControllerCreate409 = any;

export type ServiceControllerCreateMutationRequest = CreateServiceDto;

export type ServiceControllerCreateMutationResponse = ServiceControllerCreate201;

export type ServiceControllerCreateMutation = {
   Response: ServiceControllerCreate201;
   Request: ServiceControllerCreateMutationRequest;
   Errors: ServiceControllerCreate409;
};
